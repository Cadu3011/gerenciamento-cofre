import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Roles } from 'src/auth/role.decorator';
import { AuthGuard } from 'src/auth/auth.guard';
import { Role } from '@prisma/client';
import { TrierCardCron } from 'src/cardETL/cron/trier.cron';

@Controller('jobs')
export class JobsController {
  @Inject()
  private readonly jobsService: JobsService;

  @Inject()
  private readonly trierCardCron: TrierCardCron;

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create(createJobDto);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post('cron/:jobName')
  createCronJob(@Param('jobName') jobName: string) {
    const jobs = {
      TrierCards: () => this.trierCardCron.run(),
    };

    const job = jobs[jobName];

    if (!job) {
      throw new Error('Job não encontrado');
    }

    return job();
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Get()
  findAll() {
    return this.jobsService.findAll();
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobsService.update(+id, updateJobDto);
  }
}
