import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { PrismaService } from 'src/database/prisma.service';
import { AmountService } from 'src/amount/amount.service';
import { Decimal } from '@prisma/client/runtime/library';
import { FindAllQueryDto } from './dto/query-movement.dto';
import { Cron, Interval } from '@nestjs/schedule';
import { authTrier } from 'src/auth/authTrier/loginTrier';
import { MoveTrier } from './create-move-trier.service';
import { FilialService } from 'src/filial/filial.service';

@Injectable()
export class MovementService implements OnModuleInit {
  @Inject()
  private readonly Prisma: PrismaService;
  @Inject()
  private readonly Amont: AmountService;
  @Inject(MoveTrier)
  private readonly moveTrier: MoveTrier;
  @Inject()
  private readonly filial: FilialService;
  private readonly logger = new Logger(MovementService.name);
  async onModuleInit() {
    await this.getVendasCaixasTrier();
  }
  @Cron('5,38 6,8,9,11 * * 1-7')
  async getVendasCaixasTrier() {
    const lastDate = await this.Prisma.movimentations.findFirst({
      where: {
        type: 'SANGRIA',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
      },
    });

    const dateInit = new Date(lastDate.createdAt);
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

    const allResults: any[] = []; // acumulador

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
        console.log('totais');

        const idMoveTotais = totais.map((move) => ({ id: move.id }));

        const moveDetalhes = await Promise.all(
          idMoveTotais.map(async ({ id }) => {
            const res = await this.moveTrier.getVendasDetalhes(id, token);

            if (!res || !Array.isArray(res.detalhes)) {
              console.log(JSON.stringify(res, null, 2));
              console.log(`⚠️ Nenhum detalhe encontrado para id=${id}`);
              return []; // retorna array vazio para não quebrar
            }
            const moveDetalhes = res.detalhes.reduce(
              (acc, move) => {
                const { numCaixa, vlrRecebido, codFilial, datEmissao } = move;
                if (!acc[numCaixa]) {
                  acc[numCaixa] = {
                    filial: codFilial,
                    caixa: numCaixa,
                    data: datEmissao,
                    vlrRecebido: new Decimal(0),
                  };
                }

                acc[numCaixa].vlrRecebido =
                  acc[numCaixa].vlrRecebido.plus(vlrRecebido);

                return acc;
              },
              {} as Record<
                number,
                {
                  filial: number;
                  caixa: number;
                  vlrRecebido: Decimal;
                  data: string;
                }
              >,
            );

            return Object.values(moveDetalhes).map((d: any) => ({
              filial: d.filial,
              caixa: d.caixa,
              data: d.data,
              vlrRecebido: Number(d.vlrRecebido.toFixed(2)),
            }));
          }),
        );

        const movimentosFlat = moveDetalhes.flat();

        const result: {
          filial: number;
          caixa: number;
          vlrRecebido: number;
          data: string;
        }[] = Object.values(
          movimentosFlat.reduce(
            (acc, curr) => {
              if (!acc[curr.caixa]) {
                acc[curr.caixa] = { ...curr };
              } else {
                acc[curr.caixa].vlrRecebido += curr.vlrRecebido;
              }
              return acc;
            },
            {} as Record<
              number,
              {
                filial: number;
                caixa: number;
                vlrRecebido: number;
                data: string;
              }
            >,
          ),
        );

        console.log(result);

        for (const movimento of result) {
          await this.Prisma.movimentations.create({
            data: {
              filialId: movimento.filial,
              descrition: String(movimento.caixa),
              valueSangriaTrier: movimento.vlrRecebido,
              type: 'SANGRIA',
              createdAt: movimento.data,
            },
          });
        }

        // acumula no array final
        allResults.push(...result);
      }
    }

    return allResults; // só retorna depois do loop inteiro
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
    updateMovementDto: UpdateMovementDto,
  ) {
    const move = await this.Prisma.movimentations.findUnique({
      where: { id: id },
    });
    const moveCreate = await this.Prisma.movimentations.update({
      where: { id, filialId: filialId },
      data: updateMovementDto,
    });
    if (move.value == null) {
      const valueSub = new Decimal(updateMovementDto.value).sub(0);
      await this.Amont.createOrUpdate({
        filialId: moveCreate.filialId,
        balance: Number(valueSub),
      });
      return moveCreate;
    }
    const valueSub = new Decimal(updateMovementDto.value).sub(move.value);
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
