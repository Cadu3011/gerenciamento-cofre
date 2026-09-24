import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Inject,
  UseGuards,
  NotFoundException,
  Query,
  ParseBoolPipe,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Roles } from 'src/auth/role.decorator';
import { AuthGuard } from 'src/auth/auth.guard';
import { Role } from '@prisma/client';
import { RunJobQueryDto } from './dto/runCronJob.dto';

@Controller('jobs')
export class JobsController {
  @Inject()
  private readonly jobsService: JobsService;

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create(createJobDto);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post('cron/:jobName')
  createCronJob(
    @Param('jobName') jobName: string,
    @Query() options: RunJobQueryDto,
  ) {
    const jobs = {
      TrierCards: () => this.jobsService.runTrierCards(options),
      TrierMovements: () => this.jobsService.runTrierMovements(options),
      CieloETL: () => this.jobsService.runCieloETL(),
      ConciParc: () => this.jobsService.runConciParc(options),
      RedeCards: () => this.jobsService.runRedeCards(options),
      ConciCards: () => this.jobsService.runConciCards(options),
      RedeParc: () => this.jobsService.runRedeParc(options),
      TrierParc: () => this.jobsService.runTrierParc(options),
      CieloParc: () => this.jobsService.runCieloParc(options),
      Receivables: () => this.jobsService.runRecebimentos(options),
      FatoCartaoVendas: () => this.jobsService.runFatoCartaoVendas(options),
    };

    const job = jobs[jobName];

    if (!job) {
      throw new NotFoundException('Job não encontrado');
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
