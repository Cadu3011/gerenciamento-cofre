import { Injectable } from '@nestjs/common';
import { CreateConciliacaoDto } from './dto/create-conciliacao.dto';
import { UpdateConciliacaoDto } from './dto/update-conciliacao.dto';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class ConciliacaoService {
  private readonly prisma: PrismaService;
  create(createConciliacaoDto: CreateConciliacaoDto) {
    return '';
  }

  findAll() {
    return `This action returns all conciliacao`;
  }

  findOne(id: number) {
    return `This action returns a #${id} conciliacao`;
  }

  update(id: number, updateConciliacaoDto: UpdateConciliacaoDto) {
    return `This action updates a #${id} conciliacao`;
  }

  remove(id: number) {
    return `This action removes a #${id} conciliacao`;
  }
}
