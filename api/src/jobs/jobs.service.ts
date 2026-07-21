import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma, StatusCronJobs } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { TrierCardCron } from 'src/cardETL/trier/cron/trier.cron';
import { MovementService } from 'src/movement/movement.service';
import { CieloService } from 'src/cielo/cielo.service';
import { TrierDifCxETL } from 'src/trier/trierDIfCx.service';
import { RedeCardCron } from 'src/cardETL/rede/cron/rede.cron';
import { ConciCardsCron } from 'src/conciliacao/cron/execute.cron';
import { RedeParcCron } from 'src/parcETL/rede/cron/rede.cron';
import { TrierParcCron } from 'src/parcETL/trier/cron/trier.cron';
import { CieloParcETLCron } from 'src/parcETL/cielo/cron/cielo.cron';
import { ConciParcCron } from 'src/conciliacao-parc/cron/conciliacao-parc.cron';
import { JobExecutionContext } from './jobs.execContext.service';
import { JobsGateway } from './jobs.gateway';

export interface RunCronJobOptions {
  wait?: boolean;
  force?: boolean;
  logLevel?: 'ALL' | 'WARN_ERROR' | 'ERROR_ONLY' | 'NONE';
}
@Injectable()
export class JobsService {
  @Inject()
  private readonly prisma: PrismaService;
  @Inject()
  private readonly redePipelineParc: RedeParcCron;
  @Inject()
  private readonly trierPipelineParc: TrierParcCron;
  @Inject()
  private readonly redePipelineCard: RedeCardCron;
  @Inject()
  private readonly trierPipelineCard: TrierCardCron;
  @Inject()
  private readonly trierPipelineMovement: MovementService;
  @Inject()
  private readonly cieloService: CieloService;

  @Inject()
  private readonly trierPipelineCaixa: TrierDifCxETL;

  @Inject()
  private readonly conciCardsPipeline: ConciCardsCron;

  @Inject()
  private readonly cieloPipelineParc: CieloParcETLCron;

  @Inject()
  private readonly conciParcPipeline: ConciParcCron;

  @Inject()
  private readonly jobsGateway: JobsGateway;

  private readonly logger = new Logger(JobsService.name);

  async onModuleInit() {
    await this.markStuckJobs();
  }

  async markStuckJobs() {
    await this.prisma.cronJobs.updateMany({
      where: {
        status: 'RUNNING',
      },
      data: {
        status: 'FAILED',
        message: 'Servidor reiniciado durante execução',
        finishedAt: new Date(),
      },
    });
  }

  async create(createJobDto: CreateJobDto) {
    try {
      return await this.prisma.jobs.create({
        data: { ...createJobDto, status: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return { error: 'Esta Tarefa já está cadastrada' };
        }
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.jobs.findMany({
      include: { cronJobs: { take: 6, orderBy: { createdAt: 'desc' } } },
    });
  }

  findOne(id: number) {
    return this.prisma.jobs.findUnique({ where: { id } });
  }

  update(id: number, updateJobDto: UpdateJobDto) {
    return this.prisma.jobs.update({
      where: { id },
      data: updateJobDto,
    });
  }

  private async emitJob(jobName: string) {
    const job = await this.prisma.jobs.findUnique({
      where: {
        jobName,
      },
      include: {
        cronJobs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 6,
        },
      },
    });

    if (job) {
      this.jobsGateway.emitJob(job);
    }
  }

  private async executeJob(
    jobId: number,
    jobName: string,
    context: JobExecutionContext,
    execute: (context: JobExecutionContext) => Promise<void>,
    wait = false,
  ) {
    try {
      await execute(context);

      await this.prisma.cronJobs.update({
        where: { id: jobId },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          logs: JSON.parse(JSON.stringify(context.finish())),
        },
      });
    } catch (error: any) {
      await this.prisma.cronJobs.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          message: error.message,
          finishedAt: new Date(),
          logs: JSON.parse(JSON.stringify(context.finish())),
        },
      });
      if (wait) {
        throw error;
      }
    } finally {
      await this.emitJob(jobName);
    }
  }

  async runCronJob(
    jobName: string,
    execute: (context: JobExecutionContext) => Promise<void>,
    options: RunCronJobOptions = {},
  ) {
    const { wait = false, force = false, logLevel = 'ALL' } = options;
    const today = new Date().toISOString().split('T')[0];
    const jobActive = await this.prisma.jobs.findUnique({
      where: {
        jobName,
        status: true,
      },
    });
    const whereStatus: Prisma.CronJobsWhereInput[] = force
      ? [{ status: StatusCronJobs.RUNNING }]
      : [
          { status: StatusCronJobs.RUNNING },
          { status: StatusCronJobs.SUCCESS },
        ];
    const jobAnt = await this.prisma.cronJobs.findFirst({
      where: {
        jobName,
        runDate: new Date(today),
        OR: whereStatus,
      },
      orderBy: { id: 'desc' },
    });
    if (!jobActive) {
      return {
        error: `Tarefa ${jobName} inativa.`,
      };
    }
    if (jobAnt)
      return {
        error: `Tarefa ${jobName} ja finalizada ou executando.`,
      };
    let job;

    try {
      job = await this.prisma.cronJobs.create({
        data: {
          jobName,
          jobs: { connect: { jobName } },
          runDate: new Date(today),
          status: 'RUNNING',
          message: force ? 'Retentativa' : 'Agendado',
        },
      });
      const context = new JobExecutionContext(
        async (ctx) => {
          await this.prisma.cronJobs.update({
            where: { id: job.id },
            data: {
              logs: JSON.parse(JSON.stringify(ctx.finish())),
            },
          });
          await this.emitJob(jobName);
        },
        {
          logLevel,
        },
      );

      await this.emitJob(jobName);

      if (wait) {
        await this.executeJob(job.id, jobName, context, execute, true);
      } else {
        void this.executeJob(job.id, jobName, context, execute);
      }

      return {
        ok: `Tarefa ${jobName} iniciada.`,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return {
          error: `Tarefa ${jobName} já foi executada hoje.`,
        };
      }

      if (error?.code === 'P2025') {
        return {
          error: `Tarefa ${jobName} não existe ou está inativa.`,
        };
      }

      this.logger.error(error);

      return {
        error: 'Erro ao iniciar a tarefa.',
      };
    }
  }
  @Cron('20,50 6,8,9,13 * * 1-7')
  runTrierCards(force?: boolean) {
    return this.runCronJob(
      'TrierCards',
      async (context) => {
        await this.trierPipelineCard.execute(context);
      },
      { force },
    );
  }

  @Cron('20,50 6,8,9,13 * * 1-7')
  runRedeCards(force?: boolean) {
    return this.runCronJob(
      'RedeCards',
      async (context) => {
        await this.redePipelineCard.execute(context);
      },
      { force },
    );
  }

  @Cron('20,50 7,8,9,13 * * 1-7')
  runRedeParc(bigCharge?: boolean, force?: boolean) {
    return this.runCronJob(
      'RedeParc',
      async (context) => {
        const MAX_RETRIES = 100;

        for (let retry = 0; retry < MAX_RETRIES; retry++) {
          try {
            await this.redePipelineParc.execute(context, bigCharge);
            return; // Sucesso, encerra o job
          } catch (e) {
            const error = e as Error & {
              obj?: {
                code: string;
                date: string;
                filialId: number;
              };
            };

            // Erro que deve apenas ser propagado para o retry do cron
            if (error.obj?.code === '02') {
              await context.warn('RETRY', error.message);
              throw error;
            }

            // Venda não encontrada: sincroniza e tenta novamente
            if (error.obj?.code === '01') {
              const progressKey = `RedeParc-${error.obj.filialId}`;

              await context.incrementProgressRetry(progressKey);
              await context.warn(
                'RETRY',
                `Venda não encontrada. Sincronizando vendas da filial ${error.obj.filialId} para a data ${error.obj.date}.`,
              );

              const result = await this.runCronJob(
                'RedeCards',
                async (ctx) => {
                  await this.redePipelineCard.execute(
                    ctx,
                    error.obj!.date,
                    error.obj!.filialId,
                  );
                },
                { wait: true, force: true },
              );

              if ('error' in result) {
                await context.markProgressError(progressKey, result.error);
                throw new Error(result.error);
              }

              await context.incrementRetries();
              await context.info(
                'RETRY',
                'Sincronização concluída. Reexecutando ETL de parcelas.',
              );

              // Continua o for e tenta novamente o RedeParc
              continue;
            }
            const progressKey = error.obj?.filialId
              ? `RedeParc-${error.obj.filialId}`
              : undefined;

            if (progressKey) {
              await context.markProgressError(progressKey, error.message);
            }
            // Qualquer outro erro
            throw error;
          }
        }

        throw new Error(
          `Quantidade máxima de tentativas (${MAX_RETRIES}) atingida durante a recuperação automática das vendas.`,
        );
      },
      { force, logLevel: bigCharge ? 'WARN_ERROR' : 'ALL' },
    );
  }

  @Cron('20,50 6,8,9,13 * * 1-7')
  runTrierMovements(force?: boolean) {
    return this.runCronJob(
      'TrierMovements',
      async (context) => {
        await this.trierPipelineMovement.getVendasCaixasTrier(context);
      },
      { force },
    );
  }

  @Cron('10,38 7,9,10,12,13 * * 1-7')
  runConciCards(force?: boolean) {
    return this.runCronJob(
      'ConciCards',
      async (context) => {
        await this.conciCardsPipeline.execute(context);
      },
      { force },
    );
  }

  @Cron('25,50 8,10,13 * * 1-7')
  runConciParc(force?: boolean) {
    return this.runCronJob(
      'ConciParc',
      async (context) => {
        await this.conciParcPipeline.execute(context);
      },
      { force: true },
    );
  }

  @Cron('10,38 7,9,10,12,13 * * 1-7')
  runTrierParc(bigCharge?: boolean, force?: boolean) {
    return this.runCronJob(
      'TrierParc',
      async (context) => {
        try {
          await this.trierPipelineParc.execute(context, bigCharge);
        } catch (e) {
          const error = e as Error & {
            obj?: { code: string; date: string; filialId: number };
          };
          if (error.obj.code === '02') {
            await context.warn('RETRY', error.message);
            throw error;
          }
          throw error;
        }
      },
      { force, logLevel: bigCharge ? 'WARN_ERROR' : 'ALL' },
    );
  }

  @Cron('18,53 7,8,9,10,14 * * 1-7')
  runCieloETL(force?: boolean) {
    return this.runCronJob(
      'CieloETL',
      async (context) => {
        await this.cieloService.pipelineETL(context);
      },
      { force },
    );
  }

  @Cron('25,58 8,9,10,12,13 * * 1-7')
  runCieloParc(bigCharge?: boolean, force?: boolean) {
    return this.runCronJob(
      'CieloParc',
      async (context) => {
        await this.cieloPipelineParc.execute(context, bigCharge);
      },
      { force, logLevel: bigCharge ? 'WARN_ERROR' : 'ALL' },
    );
  }
}
