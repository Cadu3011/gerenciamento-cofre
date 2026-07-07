import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from '@prisma/client';
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
import { JobExecutionContext } from './jobs.execContext.service';
import { JobsGateway } from './jobs.gateway';

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
    } finally {
      await this.emitJob(jobName);
    }
  }

  async runCronJob(
    jobName: string,
    execute: (context: JobExecutionContext) => Promise<void>,
  ) {
    const today = new Date().toISOString().split('T')[0];

    const jobAnt = await this.prisma.cronJobs.findFirst({
      where: {
        jobName,
        runDate: new Date(today),
        OR: [{ status: 'RUNNING' }, { status: 'SUCCESS' }],
      },
      orderBy: { id: 'desc' },
    });

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
          message: 'Retentativa',
        },
      });
      const context = new JobExecutionContext(async (ctx) => {
        await this.prisma.cronJobs.update({
          where: { id: job.id },
          data: {
            logs: JSON.parse(JSON.stringify(ctx.finish())),
          },
        });
        await this.emitJob(jobName);
      });

      await this.emitJob(jobName);

      // Executa em background
      void this.executeJob(job.id, jobName, context, execute);

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
  runTrierCards() {
    return this.runCronJob('TrierCards', async (context) => {
      await this.trierPipelineCard.execute(context);
    });
  }

  @Cron('20,50 6,8,9,13 * * 1-7')
  runRedeCards() {
    return this.runCronJob('RedeCards', async (context) => {
      await this.redePipelineCard.execute(context);
    });
  }

  @Cron('20,50 6,8,9,13 * * 1-7')
  runRedeParc() {
    return this.runCronJob('RedeParc', async (context) => {
      await this.redePipelineParc.execute(context);
    });
  }

  @Cron('20,50 6,8,9,13 * * 1-7')
  runTrierMovements() {
    return this.runCronJob('TrierMovements', async (context) => {
      await this.trierPipelineMovement.getVendasCaixasTrier();
    });
  }

  // @Cron('5,38 5,7,10,12 * * 1-7')
  // runTrierCaixas() {
  //   return this.runCronJob('TrierCaixas', async () => {
  //     await this.trierPipelineCaixa.init();
  //   });
  // }

  @Cron('10,38 7,9,10,12,13 * * 1-7')
  runConciCards() {
    return this.runCronJob('ConciCards', async (context) => {
      await this.conciCardsPipeline.execute();
    });
  }

  @Cron('10,38 7,9,10,12,13 * * 1-7')
  runTrierParc() {
    return this.runCronJob('TrierParc', async (context) => {
      await this.trierPipelineParc.execute(context);
    });
  }

  @Cron('18,53 7,8,9,10,14 * * 1-7')
  runCieloETL() {
    return this.runCronJob('CieloETL', async (context) => {
      await this.cieloService.pipelineETL();
    });
  }

  @Cron('25,58 8,9,10,12,13 * * 1-7')
  runCieloParc() {
    return this.runCronJob('CieloParc', async (context) => {
      await this.cieloPipelineParc.execute(context);
    });
  }
}
