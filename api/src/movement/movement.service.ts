import { Inject, Injectable } from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { PrismaService } from 'src/database/prisma.service';
import { AmountService } from 'src/amount/amount.service';
import { Decimal } from '@prisma/client/runtime/library';
import { FindAllQueryDto } from './dto/query-movement.dto';

@Injectable()
export class MovementService {
  @Inject()
  private readonly Prisma: PrismaService;
  @Inject()
  private readonly Amont: AmountService;

  async create(createMovementDto: CreateMovementDto) {
    if (
      createMovementDto.type == 'DEPOSITO' ||
      (createMovementDto.type == 'DESPESA' && createMovementDto.value > 0)
    ) {
      const saida = createMovementDto.value * -1;
      await this.Prisma.movimentations.create({
        data: {
          ...createMovementDto,
          value: saida,
        },
      });
      await this.Amont.createOrUpdate({
        filialId: createMovementDto.filialId,
        balance: saida,
      });
    } else {
      await this.Prisma.movimentations.create({ data: createMovementDto });
      await this.Amont.createOrUpdate({
        filialId: createMovementDto.filialId,
        balance: createMovementDto.value,
      });
    }
  }

  findAll(query: FindAllQueryDto) {
    const { createdAt, type, filialId } = query;
    const where: any = {};
    if (createdAt) where.createdAt = new Date(createdAt);
    if (type) where.type = type;
    if (filialId) where.filialId = filialId;
    return this.Prisma.movimentations.findMany({ where });
  }

  findOne(id: number) {
    return this.Prisma.movimentations.findUnique({ where: { id } });
  }
  async findByFilialOperator(filialIdUser: number) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const movements = await this.Prisma.movimentations.findMany({
      where: {
        filialId: filialIdUser,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
    return movements;
  }
  update(filialId: number, id: number, updateMovementDto: UpdateMovementDto) {
    return this.Prisma.movimentations.update({
      where: { id, filialId: filialId },
      data: updateMovementDto,
    });
  }
  async remove(filialId: number, id: number) {
    const moveDel = await this.Prisma.movimentations.delete({
      where: { id, filialId: filialId },
    });
    const valueSub = new Decimal(moveDel.value).negated().toNumber();
    await this.Amont.createOrUpdate({
      filialId: filialId,
      balance: valueSub,
    });
    return moveDel;
  }
}
