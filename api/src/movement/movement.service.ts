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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { idCategoria, tokenTrier, ...dtoWithoutCategory } =
      createMovementDto;
    if (
      createMovementDto.type == 'DEPOSITO' ||
      (createMovementDto.type == 'DESPESA' && createMovementDto.value > 0)
    ) {
      const saida = createMovementDto.value * -1;
      const moveCreate = await this.Prisma.movimentations.create({
        data: {
          ...dtoWithoutCategory,
          value: saida,
        },
        include: {
          filial: {
            select: {
              name: true,
            },
          },
        },
      });
      await this.Amont.createOrUpdate({
        filialId: createMovementDto.filialId,
        balance: saida,
      });
      return moveCreate;
    } else {
      const moveCreate = await this.Prisma.movimentations.create({
        data: dtoWithoutCategory,
        include: {
          filial: {
            select: {
              name: true, // retorna apenas o nome
            },
          },
        },
      });
      await this.Amont.createOrUpdate({
        filialId: createMovementDto.filialId,
        balance: createMovementDto.value,
      });
      return moveCreate;
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
  async findAnt(filialIdUser: number) {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);

    const endOfDay = new Date(inicioHoje);
    endOfDay.setHours(23, 59, 59, 999);

    // Etapa 1: Verificar se existem movimentações hoje
    const movimentosHoje = await this.Prisma.movimentations.findFirst({
      where: {
        filialId: filialIdUser,
        createdAt: {
          gte: inicioHoje,
          lte: endOfDay,
        },
      },
    });

    let dataBaseBusca: Date;

    if (movimentosHoje) {
      // Existem lançamentos hoje → buscar o último dia anterior com dados
      const ultimaMovimentacaoAntesDeHoje =
        await this.Prisma.movimentations.findFirst({
          where: {
            filialId: filialIdUser,
            createdAt: {
              lt: inicioHoje, // apenas datas antes de hoje
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      if (!ultimaMovimentacaoAntesDeHoje) return []; // nunca houve lançamentos antes de hoje

      dataBaseBusca = new Date(ultimaMovimentacaoAntesDeHoje.createdAt);
    } else {
      const ultimaMovimentacao = await this.Prisma.movimentations.findFirst({
        where: {
          filialId: filialIdUser,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!ultimaMovimentacao) return []; // não há movimentações nunca

      dataBaseBusca = new Date(ultimaMovimentacao.createdAt);
    }

    // Etapa 2: buscar todas as movimentações desse dia encontrado
    const inicio = new Date(dataBaseBusca);
    inicio.setHours(0, 0, 0, 0);

    const fim = new Date(dataBaseBusca);
    fim.setHours(23, 59, 59, 999);

    const movimentos = await this.Prisma.movimentations.findMany({
      where: {
        filialId: filialIdUser,
        createdAt: {
          gte: inicio,
          lte: fim,
        },
      },
    });

    return movimentos;
  }
  update(filialId: number, id: number, updateMovementDto: UpdateMovementDto) {
    return this.Prisma.movimentations.update({
      where: { id, filialId: filialId },
      data: updateMovementDto,
    });
  }
  updateSync(id: number, idTrierMove: number) {
    return this.Prisma.movimentations.update({
      where: { id },
      data: {
        status: 'SINCRONIZADO',
        idTrier: idTrierMove,
      },
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
  async insertMoveTrierDeleted(id: number) {
    const moveDel = await this.Prisma.deletedMovements.create({
      data: { movementId: id },
    });
    return moveDel;
  }
  async deleteMoveTrier(id: number) {
    const moveDel = await this.Prisma.deletedMovements.delete({
      where: { movementId: id },
    });
    return moveDel;
  }
}
