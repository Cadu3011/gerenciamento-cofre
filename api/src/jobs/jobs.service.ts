import { Inject, Injectable } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class JobsService {
  @Inject()
  private readonly prisma: PrismaService;

  create(createJobDto: CreateJobDto) {
    return this.prisma.jobs.create({
      data: { ...createJobDto, status: 'ATIVO' },
    });
  }

  findAll() {
    return this.prisma.jobs.findMany();
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
}
