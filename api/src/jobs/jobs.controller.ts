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

@Controller('jobs')
export class JobsController {
  @Inject()
  private readonly jobsService: JobsService;

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    console.log(createJobDto);
    return this.jobsService.create(createJobDto);
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
