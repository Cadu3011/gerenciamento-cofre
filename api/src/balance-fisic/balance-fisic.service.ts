import { Inject, Injectable } from '@nestjs/common';
import { CreateBalanceFisicDto } from './dto/create-balance-fisic.dto';
import { UpdateBalanceFisicDto } from './dto/update-balance-fisic.dto';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class BalanceFisicService {
  @Inject()
  private readonly Prisma: PrismaService;

  create(createBalanceFisicDto: CreateBalanceFisicDto, filialId: number) {
    return this.Prisma.balanceFisic.create({
      data: { ...createBalanceFisicDto, filialId: filialId },
    });
  }

  findByDateAt(filialId: number) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.Prisma.balanceFisic.findMany({
      where: { filialId, createdAt: { gte: start, lte: end } },
    });
  }

  update(filialId: number, updateBalanceFisicDto: UpdateBalanceFisicDto) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.Prisma.balanceFisic.updateMany({
      where: { filialId, createdAt: { gte: start, lte: end } },
      data: updateBalanceFisicDto,
    });
  }
}
