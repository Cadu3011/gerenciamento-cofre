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
import { ReceivableCron } from 'src/receivable/receivable.cron';
import { JobExecutionContext } from './jobs.execContext.service';
import { JobsGateway } from './jobs.gateway';
import { InfoJob } from './dto/options-job';
import { LogLevel, RunJobQueryDto, JobPeriodType } from './dto/runCronJob.dto';

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
  private readonly receivableCron: ReceivableCron;

  @Inject()
  private readonly jobsGateway: JobsGateway;

  private readonly logger = new Logger(JobsService.name);

  private normalizeOptions(options: RunJobQueryDto = {}): RunJobQueryDto {
    return {
      ...options,
      logLevel:
        options.logLevel ??
        (options.bigCharge ? LogLevel.WARN_ERROR : LogLevel.ALL),
    };
  }

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

  private async runJob(infoJob: InfoJob, wait?: boolean) {
    const { jobId, jobName, context, options, execute } = infoJob;
    try {
      await execute(context, options);

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
    config: {
      jobName: string;
      wait?: boolean;
    },

    execute: (
      context: JobExecutionContext,
      options: RunJobQueryDto,
    ) => Promise<void>,
    options: RunJobQueryDto = {},
  ) {
    const { force = false, logLevel = 'ALL' } = options;
    const { jobName, wait = false } = config;
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
      const infoJob: InfoJob = {
        jobId: job.id,
        jobName,
        context,
        execute,
        options,
      };
      if (wait) {
        await this.runJob(infoJob, true);
      } else {
        void this.runJob(infoJob);
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
  runTrierCards(options: RunJobQueryDto = {}) {
    return this.runCronJob(
      { jobName: 'TrierCards' },
      async (context, opts) => {
        try {
          await this.trierPipelineCard.execute(context, opts);
          return;
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
      this.normalizeOptions(options),
    );
  }

  @Cron('20,50 6,8,9,13 * * 1-7')
  runRedeCards(options: RunJobQueryDto = {}) {
    return this.runCronJob(
      { jobName: 'RedeCards' },
      async (context, opts) => {
        try {
          await this.redePipelineCard.execute(context, opts);
          return;
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
      this.normalizeOptions(options),
    );
  }

  @Cron('20,50 7,8,9,13 * * 1-7')
  runRedeParc(options: RunJobQueryDto = {}) {
    return this.runCronJob(
      { jobName: 'RedeParc' },
      async (context, opts) => {
        const MAX_RETRIES = 100;

        for (let retry = 0; retry < MAX_RETRIES; retry++) {
          try {
            await this.redePipelineParc.execute(context, opts);
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
                { jobName: 'RedeCards', wait: true },
                async (ctx) => {
                  await this.redePipelineCard.execute(
                    ctx,
                    { period: JobPeriodType.DATE, date: error.obj!.date },
                    error.obj!.filialId,
                  );
                },
                { force: true },
              );

              if ('error' in result) {
                await context.markProgressError(progressKey, result.error);
                throw new Error(result.error);
              }

              await context.incrementRetries();
              await context.info(
                'RETRY',
                `Sincronização concluída. Reiniciando ETL de parcelas a partir da data ${error.obj!.date}.`,
              );

              // Continua o for e tenta novamente o RedeParc
              opts = { ...opts, retryStartDate: error.obj!.date };
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
      this.normalizeOptions(options),
    );
  }

  @Cron('20,50 6,8,9,13 * * 1-7')
  runTrierMovements(options: RunJobQueryDto = {}) {
    return this.runCronJob(
      { jobName: 'TrierMovements' },
      async (context) => {
        await this.trierPipelineMovement.getVendasCaixasTrier(context);
      },
      this.normalizeOptions(options),
    );
  }

  @Cron('10,38 7,9,10,12,13 * * 1-7')
  runConciCards(options: RunJobQueryDto = {}) {
    return this.runCronJob(
      { jobName: 'ConciCards' },
      async (context, opts) => {
        await this.conciCardsPipeline.execute(context, opts);
      },
      this.normalizeOptions(options),
    );
  }

  @Cron('25,50 8,10,13 * * 1-7')
  runConciParc(options: RunJobQueryDto = {}) {
    return this.runCronJob(
      { jobName: 'ConciParc' },
      async (context, opts) => {
        try {
          await this.conciParcPipeline.execute(context, opts);
          return;
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
      this.normalizeOptions(options),
    );
  }

  @Cron('10,38 7,9,10,12,13 * * 1-7')
  runTrierParc(options: RunJobQueryDto = {}) {
    return this.runCronJob(
      { jobName: 'TrierParc' },
      async (context, opts) => {
        try {
          await this.trierPipelineParc.execute(context, opts);
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
      this.normalizeOptions(options),
    );
  }

  @Cron('18,53 7,8,9,10,14 * * 1-7')
  runCieloETL() {
    return this.runCronJob({ jobName: 'CieloETL' }, async (context) => {
      await this.cieloService.pipelineETL(context);
    });
  }

  @Cron('25,58 8,9,10,12,13 * * 1-7')
  runCieloParc(options: RunJobQueryDto = {}) {
    return this.runCronJob(
      { jobName: 'CieloParc' },
      async (context, opts) => {
        await this.cieloPipelineParc.execute(context, opts.bigCharge);
      },
      this.normalizeOptions(options),
    );
  }

  @Cron('0 1 * * 1-7')
  runRecebimentos(options: RunJobQueryDto = {}) {
    return this.runCronJob(
      { jobName: 'Receivables' },
      async (context, opts) => {
        try {
          await this.receivableCron.execute(context, opts);
          return;
        } catch (e) {
          const error = e as Error & {
            obj?: { code: string };
          };
          if (error.obj?.code === '02') {
            await context.warn('RETRY', error.message);
            throw error;
          }
          throw error;
        }
      },
      this.normalizeOptions(options),
    );
  }
}
