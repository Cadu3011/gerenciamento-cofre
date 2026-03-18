import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { PrismaService } from 'src/database/prisma.service';
import { AmountService } from 'src/amount/amount.service';
import { Decimal } from '@prisma/client/runtime/library';
import { FindAllQueryDto } from './dto/query-movement.dto';
import { Interval } from '@nestjs/schedule';
import { authTrier } from 'src/auth/authTrier/loginTrier';
import { MoveTrier } from './create-move-trier.service';
import { FilialService } from 'src/filial/filial.service';
import { Prisma } from '@prisma/client';

interface SalesTrierDin {
  financeiroMovimentacaoId: number;
  codFilial: number;
  numNota: number;
  numCaixa: number;
  datEmissao: string; // ISO string (pode converter pra Date depois)
  datReceb: string;
  vlrRecebido: number;
  tipo: string;
  observacao: string | null;
}

@Injectable()
export class MovementService {
  @Inject()
  private readonly Prisma: PrismaService;
  @Inject()
  private readonly Amont: AmountService;
  @Inject(MoveTrier)
  private readonly moveTrier: MoveTrier;
  @Inject()
  private readonly filial: FilialService;

  private readonly logger = new Logger(MovementService.name);

  async findVendasCaixas(filialId: number) {
    return this.Prisma.salesDin.groupBy({
      by: ['numCaixa', 'filialId'],
      where: { filialId, moveId: null },
      orderBy:{ numCaixa: 'asc' },
      _sum: {
        valor: true,
      },
    });
  }

  async getVendasCaixasTrier() {
    const lastDate = (await this.Prisma.salesDin.findFirst({
      orderBy: {
        sale_date: 'desc',
      },
      select: {
        sale_date: true,
      },
    })) ?? { sale_date: new Date('2026-03-10') };

    const dateInit = new Date(lastDate.sale_date);
    dateInit.setDate(dateInit.getDate() + 1);
    const dataAtual = new Date();
    const dataAtualFormat = new Date(
      Date.UTC(
        dataAtual.getUTCFullYear(),
        dataAtual.getUTCMonth(),
        dataAtual.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    const token = await authTrier({
      login: '95',
      password: 'cadu3011',
    });

    for (
      let current = new Date(dateInit);
      current < dataAtualFormat;
      current.setDate(current.getDate() + 1)
    ) {
      console.log(current, dataAtualFormat);

      const initDay = new Date(
        Date.UTC(
          current.getUTCFullYear(),
          current.getUTCMonth(),
          current.getUTCDate(),
          3,
          0,
          0,
          0,
        ),
      );

      const finalDay = new Date(
        Date.UTC(
          current.getUTCFullYear(),
          current.getUTCMonth(),
          current.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );

      console.log(initDay, finalDay);

      const totais = await this.moveTrier.getVendasTotais(
        initDay,
        finalDay,
        token,
      );

      if (totais) {
        try {
          const idMoveTotais = totais.map((move) => ({ id: move.id }));
          const moveDetalhes = await Promise.all(
            idMoveTotais.map(async ({ id }) => {
              const res = await this.moveTrier.getVendasDetalhes(id, token);

              if (!res || !Array.isArray(res.detalhes)) {
                console.log(JSON.stringify(res, null, 2));
                console.log(`⚠️ Nenhum detalhe encontrado para id=${id}`);
                return [];
              }

              const moveDet = res.detalhes.map(
                (d: SalesTrierDin, index: number) => ({
                  filialId: d.codFilial,
                  numCaixa: d.numCaixa,
                  numNota: d.numNota,
                  idempotencyKey: `${d.codFilial}-${d.numCaixa}-${d.numNota}-${
                    d.observacao === 'RECEBIMENTO CREDIÁRIO'
                      ? 'REC_CREDIARIO'
                      : d.observacao === 'OUTRAS FORMAS PAGTO'
                        ? 'REC_CREDIARIO_CARTAO'
                        : 'REC_VENDA'
                  }-${index}`,
                  sale_date:
                    d.observacao === 'RECEBIMENTO CREDIÁRIO'
                      ? new Date(`${d.datReceb}T00:00:00-03:00`)
                      : new Date(d.datEmissao),
                  valor: Number(d.vlrRecebido.toFixed(2)),
                  financeiroMovimentacaoId: d.financeiroMovimentacaoId,
                  tipo:
                    d.observacao === 'RECEBIMENTO CREDIÁRIO'
                      ? 'REC_CREDIARIO'
                      : d.observacao === 'OUTRAS FORMAS PAGTO'
                        ? 'REC_CREDIARIO_CARTAO'
                        : 'REC_VENDA',
                }),
              );

              return moveDet;
            }),
          );

          const movimentosFlat = moveDetalhes.flat();

          await this.Prisma.salesDin.createMany({
            data: movimentosFlat.map((m) => ({
              ...m,
            })),
            skipDuplicates: true,
          });
        } catch (error) {
          console.log(error);
          throw 'Erro ao processar movimentações.';
        }
      }
    }
  }

  @Interval(30_000)
  async checkPendingMovements() {
    const pendentesDeleteds = await this.Prisma.deletedMovements.findMany({
      where: { status: 'PENDENTE' },
    });
    const pendentesCreateds = await this.Prisma.movimentations.findMany({
      where: { status: 'PENDENTE', type: { in: ['DESPESA', 'DEPOSITO'] } },
      include: {
        filial: {
          select: {
            name: true,
            idCofreTrier: true,
            idBancoDefault: true,
          },
        },
      },
    });
    if (pendentesDeleteds.length > 0) {
      this.logger.warn(
        `Encontradas ${pendentesDeleteds.length} movimentações pendentes.`,
      );
      await this.processMovementDeleted(pendentesDeleteds);
    }
    if (pendentesCreateds.length > 0) {
      this.logger.warn(
        `Encontradas ${pendentesCreateds.length} movimentações pendentes.`,
      );
      await this.processMovementCreated(pendentesCreateds);
    }
  }

  private async processMovementCreated(movement: any) {
    const token = await authTrier({
      login: '95',
      password: 'cadu3011',
    });
    for (const move of movement) {
      this.logger.log(`Processando movimentação ${move.id}`);
      if (move.type === 'DESPESA') {
        const createdMoveTrier: number = await this.moveTrier.createDesp({
          idFilial: move.filialId,
          descricao: move.descrition,
          filialName: move.filial.name,
          idCofre: move.filial.idCofreTrier,
          valor: move.value,
          idCategoria: Number(move.idCategoria),
          date: move.createdAt,
          token,
        });
        if (createdMoveTrier !== undefined) {
          await this.updateSync(move.id, createdMoveTrier);
        }
      }
      if (move.type === 'DEPOSITO') {
        if (move.idContaDest === move.filial.idBancoDefault) {
          const idTrierTransf: number = await this.moveTrier.createTransf({
            idFilial: move.filialId,
            descricao: move.descrition,
            filialName: move.filial.name,
            idCofre: move.filial.idCofreTrier,
            idCofreDestino: move.filial.idBancoDefault,
            idFilialDestino: move.filialId,
            valor: move.value.mul(-1),
            idCategoria: Number(move.idCategoria),
            date: move.createdAt,
            token,
          });
          if (idTrierTransf) {
            await this.updateSync(move.id, idTrierTransf);
            await this.updateIdContaDest(move.id, move.filial.idBancoDefault);
          }
        } else {
          const filialDestino = await this.filial.findByCofreDest(
            move.idContaDest,
          );

          const idTrierTransf: number = await this.moveTrier.createTransf({
            idFilial: move.filialId,
            descricao: move.descrition,
            filialName: move.filial.name,
            idCofre: move.filial.idCofreTrier,
            idCofreDestino: move.idContaDest,
            idFilialDestino: filialDestino.id,
            valor: move.value.mul(-1),
            idCategoria: Number(move.idCategoria),
            date: move.createdAt,
            token,
          });
          if (idTrierTransf) {
            await this.updateSync(move.id, idTrierTransf);
          }
        }
      }
    }
  }

  private async processMovementDeleted(movement: any) {
    const tokenTrier = await authTrier({
      login: '95',
      password: 'cadu3011',
    });
    for (const mov of movement) {
      this.logger.log(`Processando movimentação ${mov.id}`);
      const deletedMoveTrier = await this.moveTrier.deleteMoves(
        mov.movementId,
        tokenTrier,
      );
      console.log(deletedMoveTrier);
      if (deletedMoveTrier !== undefined) {
        await this.Prisma.deletedMovements.delete({
          where: { movementId: deletedMoveTrier },
        });
      }
    }
  }

  async create(createMovementDto: CreateMovementDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tokenTrier, ...dtoWithoutCategory } = createMovementDto;
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
              idCofreTrier: true,
              idBancoDefault: true,
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
              name: true,
              idCofreTrier: true,
              idBancoDefault: true,
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
        OR: [
          {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          {
            value: null,
          },
          {
            updatedAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        ],
      },
    });
    return movements;
  }
  async findAnt(filialIdUser: number) {
    // Definir início do dia atual
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Buscar a última movimentação ANTES de hoje
    const ultimaAntes = await this.Prisma.movimentations.findFirst({
      where: {
        filialId: filialIdUser,
        updatedAt: { lt: hoje }, // só dias antes de hoje
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!ultimaAntes) return []; // nunca houve lançamentos antes de hoje

    // Pegar todas as movimentações do dia da última encontrada
    const dataBase = new Date(ultimaAntes.updatedAt);
    const inicio = new Date(dataBase);
    inicio.setHours(0, 0, 0, 0);

    const fim = new Date(dataBase);
    fim.setHours(23, 59, 59, 999);

    return this.Prisma.movimentations.findMany({
      where: {
        filialId: filialIdUser,
        updatedAt: {
          gte: inicio,
          lte: fim,
        },
        value: { not: null },
      },
      orderBy: { updatedAt: 'asc' }, // opcional
    });
  }
  async update(
    filialId: number,
    id: number,
    createMovementDto: CreateMovementDto,
  ) {
    console.log(createMovementDto);
    const move = await this.Prisma.movimentations.findUnique({
      where: { id: id },
    });
    const moveCreate = await this.Prisma.movimentations.upsert({
      where: { id, filialId: filialId },
      update: {
        value: Decimal(createMovementDto.value),
      },
      create: {
        ...createMovementDto,
        value: Decimal(createMovementDto.value),
        type: 'SANGRIA',
        descrition: String(createMovementDto.descrition),
        filialId,
      },
    });
    await this.Prisma.salesDin.updateMany({
      where: {numCaixa: Number(moveCreate.descrition), filialId: filialId},
      data: {moveId: moveCreate.id},
    })

    if (move.value == null) {
      const valueSub = new Decimal(createMovementDto.value).sub(0);
      await this.Amont.createOrUpdate({
        filialId: moveCreate.filialId,
        balance: Number(valueSub),
      });
      return moveCreate;
    }
    const valueSub = new Decimal(createMovementDto.value).sub(move.value);
    await this.Amont.createOrUpdate({
      filialId: moveCreate.filialId,
      balance: Number(valueSub),
    });
    return moveCreate;
  }

  updateIdContaDest(id: number, idContaDest: number) {
    return this.Prisma.movimentations.update({
      where: { id },
      data: {
        idContaDest: idContaDest,
      },
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
