import { Inject, Injectable } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { TrierCardCron } from 'src/cardETL/cron/trier.cron';
import { MovementService } from 'src/movement/movement.service';
import { CieloService } from 'src/cielo/cielo.service';

@Injectable()
export class JobsService {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly trierPipelineCard: TrierCardCron;
  @Inject()
  private readonly trierPipelineMovement: MovementService;
  @Inject()
  private readonly cieloService: CieloService;

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
      include: { cronJobs: { orderBy: { createdAt: 'desc' } } },
      take: 10,
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
  async runCronJob(jobName: string, execute: () => Promise<void>) {
    const today = new Date().toISOString().split('T')[0];

    let job;

    try {
      job = await this.prisma.cronJobs.upsert({
        where: {
          jobName_runDate: { jobName, runDate: new Date(today) },
          status: { not: 'SUCCESS' },
        },
        create: {
          jobName,
          status: 'RUNNING',
          message: '',
          runDate: new Date(today),
          jobs: { connect: { jobName, status: true } },
        },
        update: {
          message: 'Retentativa',
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        console.log(`Job ${jobName} já finalizado`);
        return { error: `Tarefa ${jobName} já finalizada hoje` };
      }

      if (error?.code === 'P2025') {
        console.log(`Job ${jobName} não está ativo ou não existe`);
        return { error: `Tarefa ${jobName} não está ativo ou não existe` };
      }

      throw error;
    }

    try {
      await execute();

      await this.prisma.cronJobs.update({
        where: { id: job.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
        },
      });
    } catch (error: any) {
      await this.prisma.cronJobs.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          message: error.message,
          finishedAt: new Date(),
        },
      });
    }
  }

  @Cron('20,50 6,8,9,13 * * 1-7')
  async runTrierCards() {
    return await this.runCronJob('TrierCards', async () => {
      await this.trierPipelineCard.execute();
    });
  }

  @Cron('20,50 6,8,9,13 * * 1-7')
  async runTrierMovements() {
    return await this.runCronJob('TrierMovements', async () => {
      await this.trierPipelineMovement.getVendasCaixasTrier();
    });
  }

  @Cron('18,53 7,8,9,10,14 * * 1-7')
  async runCieloETL() {
    return await this.runCronJob('CieloETL', async () => {
      await this.cieloService.pipelineETL();
    });
  }
}
