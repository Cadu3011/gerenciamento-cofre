import { Inject, Injectable } from '@nestjs/common';
import { CreateFilialDto } from './dto/create-filial.dto';
import { UpdateFilialDto } from './dto/update-filial.dto';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class FilialService {
  @Inject()
  private readonly Prisma: PrismaService

  create(createFilialDto: CreateFilialDto) {
    return this.Prisma.filial.create({data:createFilialDto})
  }

  findAll() {
    return this.Prisma.filial.findMany()
  }

  findOne(id: number) {
    return this.Prisma.filial.findUnique({where:{id}})
  }

  update(id: number, updateFilialDto: UpdateFilialDto) {
    return this.Prisma.filial.update({where:{id},data:updateFilialDto})
  }

  
}
