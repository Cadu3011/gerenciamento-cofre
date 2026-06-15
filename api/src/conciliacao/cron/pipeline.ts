import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  RedeVenda,
  TrierCartaoVendas,
  StatusConciliacao,
  Conciliacao,
} from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { MatchService } from './match.service';
import { Decimal } from '@prisma/client/runtime/library';
type CardsCielo = Awaited<ReturnType<MatchService['getCardsCielo']>>;
type CardCielo = CardsCielo[number];

@Injectable()
export class Pipeline {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly matchService: MatchService;

  private readonly logger = new Logger(Pipeline.name);

  async execute(filialId: number, date: string) {
    const percentualMinimoPorFilial = {
      1: 92.32,
      2: 91.67,
      3: 93.19,
      4: 97.01,
      5: 81.57,
      6: 97.0,
    };
    const groups = await this.matchService.matchMovements(filialId, date);
    this.logger.log(
      `Filial ${filialId} Data ${date} - Groups: ${groups.length}`,
    );
    await this.criarGruposEItens(filialId, date, groups);

    const conciliacao = await this.prisma.conciliacao.findUnique({
      where: {
        filialId_startDate: {
          filialId,
          startDate: new Date(`${date}T00:00:00.000Z`),
        },
      },
    });

    if (!conciliacao) {
      this.logger.warn(
        `Filial ${filialId} Data ${date} - Conciliação não encontrada`,
      );
      return;
    }

    const [total, conciliados] = await Promise.all([
      this.prisma.conciliacaoGrupo.count({
        where: {
          conciliacaoId: conciliacao.id,
          status: {
            not: 'CANCELADO',
          },
        },
      }),

      this.prisma.conciliacaoGrupo.count({
        where: {
          conciliacaoId: conciliacao.id,
          status: 'CONCILIADO',
        },
      }),
    ]);

    if (total === 0) {
      this.logger.warn(
        `Filial ${filialId} Data ${date} - Nenhum grupo encontrado`,
      );
      return;
    }

    const naoConciliados = total - conciliados;
    const percentual = (conciliados / total) * 100;

    this.logger.log(
      `Filial ${filialId} Data ${date} - ${conciliados}/${total} (${percentual.toFixed(2)}%)`,
    );
    const percentualMinimo = percentualMinimoPorFilial[filialId] ?? 90;

    if (naoConciliados >= 4 && percentual < percentualMinimo) {
      await this.prisma.conciliacao.update({
        where: { id: conciliacao.id },
        data: {
          status: 'DIVERGENTE',
          motivo: `${percentual}% concluido`,
        },
      });

      throw new Error(
        `Taxa de conciliação abaixo do esperado (${percentual.toFixed(2)}%)`,
      );
    }

    await this.prisma.conciliacao.update({
      where: { id: conciliacao.id },
      data: {
        status: 'CONCILIADO',
        motivo: `${percentual}% concluido`,
      },
    });
  }

  gerarItensParaGrupo(group: any, grupoId: number) {
    const itens = [];
    if (group.trier)
      itens.push({
        grupoId: grupoId,
        trierId: group.trier.id,
        origem: 'TRIER',
        valor: group.trier.valor,
        dataReferencia: group.trier.dataEmissao,
      });
    if (group.rede)
      itens.push({
        grupoId: grupoId,
        redeId: group.rede.id,
        origem: 'REDE',
        valor: group.rede.valor,
        dataReferencia: group.rede.dataVenda,
      });
    if (group.cielo?.ids?.length) {
      const total = Number(group.cielo._sum.valorBruto);
      const quantidade = group.cielo.ids.length;

      // 🔥 divisão com ajuste de centavos
      const valorBase = Math.floor((total / quantidade) * 100) / 100;
      let resto = Number((total - valorBase * quantidade).toFixed(2));

      group.cielo.ids.forEach((id: number, index: number) => {
        let valor = valorBase;

        // distribui o resto (centavos) nos primeiros itens
        if (resto > 0) {
          valor += 0.01;
          resto = Number((resto - 0.01).toFixed(2));
        }

        itens.push({
          grupoId: grupoId,
          cieloId: id,
          origem: 'CIELO',
          valor,
          dataReferencia: new Date(`${group.cielo.dataVenda}T00:00:00.000Z`),
        });
      });
    }
    return itens;
  }

  async criarGruposEItens(
    filialId: number,
    date: string,
    groups: {
      status: StatusConciliacao;
      trier: TrierCartaoVendas;
      rede: RedeVenda;
      cielo: CardCielo;
    }[],
  ) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 2️⃣ Cria todos os grupos e itens dentro de uma transação
    await this.prisma.$transaction(async (tx) => {
      const conciliacao = await tx.conciliacao.upsert({
        where: {
          filialId_startDate: {
            filialId,
            startDate: new Date(`${date}T00:00:00.000Z`),
          },
        },
        update: {},
        create: {
          filialId,
          startDate: new Date(`${date}T00:00:00.000Z`),
          metodo: 'AUTO',
        },
      });
      // Primeiro cria grupos conciliados
      const conciliados = groups.filter((g) => g.status === 'CONCILIADO');

      const gruposConciliados = await Promise.all(
        conciliados.map((group) => {
          const valorTrier = group.trier?.valor ?? new Decimal(0);
          const valorRede = group.rede?.valor ?? new Decimal(0);
          const valorCielo = group.cielo?._sum?.valorBruto ?? new Decimal(0);
          const valorFinal = valorTrier.sub(valorRede.plus(valorCielo));
          return tx.conciliacaoGrupo.upsert({
            where: {
              idempotencyKey: `|CONCILIADO|${hoje.toISOString().split('T')[0]}T00:00:00.000Z|${filialId}|${group.rede?.idempotencyKey}|${group.trier?.idempotencyKey}|${group.cielo?.codigoTransacao}`,
            },
            update: {},
            create: {
              conciliacaoId: conciliacao.id,
              metodo: 'AUTO',
              status: 'CONCILIADO',
              valorFinal: valorFinal,
              idempotencyKey: `|CONCILIADO|${hoje.toISOString().split('T')[0]}T00:00:00.000Z|${filialId}|${group.rede?.idempotencyKey}|${group.trier?.idempotencyKey}|${group.cielo?.codigoTransacao}`,
              ...(group.cielo?._sum.valorBruto && {
                valorCielo: group.cielo._sum.valorBruto,
              }),
              ...(group.rede?.valor && { valorRede: group.rede.valor }),
              ...(group.trier?.valor && { valorTrier: group.trier.valor }),
            },
          });
        }),
      );

      // Cria os itens correspondentes
      const itensConciliados = gruposConciliados.flatMap((grupo, idx) =>
        this.gerarItensParaGrupo(conciliados[idx], grupo.id),
      );
      if (itensConciliados.length > 0) {
        const trierIds = [
          ...new Set(itensConciliados.map((i) => i.trierId).filter(Boolean)),
        ];
        const redeIds = [
          ...new Set(itensConciliados.map((i) => i.redeId).filter(Boolean)),
        ];
        const cieloIds = [
          ...new Set(itensConciliados.map((i) => i.cieloId).filter(Boolean)),
        ];

        // 🔥 1. remove vínculos antigos
        await tx.conciliacaoItem.deleteMany({
          where: {
            OR: [
              { trierId: { in: trierIds } },
              { redeId: { in: redeIds } },
              { cieloId: { in: cieloIds } },
            ],
          },
        });

        // 🔥 2. cria novos itens
        await tx.conciliacaoItem.createMany({
          data: itensConciliados,
        });

        // 🔥 3. atualiza status
        if (trierIds.length) {
          await tx.trierCartaoVendas.updateMany({
            where: { id: { in: trierIds } },
            data: { statusConciliacao: 'CONCILIADO' },
          });
        }

        if (redeIds.length) {
          await tx.redeVenda.updateMany({
            where: { id: { in: redeIds } },
            data: { statusConciliacao: 'CONCILIADO' },
          });
        }

        if (cieloIds.length) {
          await tx.cartaoVendas.updateMany({
            where: { id: { in: cieloIds } },
            data: { statusConciliacao: 'CONCILIADO' },
          });
        }

        // 🔥 4. remove grupos vazios
        await tx.conciliacaoGrupo.deleteMany({
          where: {
            metodo: 'AUTO',
            OR: [{ status: 'DIVERGENTE' }, { status: 'PENDENTE' }],
            itens: {
              none: {},
            },
          },
        });
      }

      // Depois cria grupos divergentes
      const divergentes = groups.filter((g) => g.status === 'DIVERGENTE');

      const gruposDivergentes = await Promise.all(
        divergentes.map((group) => {
          const valorTrier = group.trier?.valor ?? new Decimal(0);
          const valorRede = group.rede?.valor ?? new Decimal(0);
          const valorCielo = group.cielo?._sum?.valorBruto ?? new Decimal(0);
          const valorFinal = valorTrier.sub(valorRede.plus(valorCielo));
          return tx.conciliacaoGrupo.upsert({
            where: {
              idempotencyKey: `|DIVERGENTE|${hoje.toISOString().split('T')[0]}T00:00:00.000Z|${filialId}|${group.rede?.idempotencyKey}|${group.trier?.idempotencyKey}|${group.cielo?.codigoTransacao}`,
            },
            update: {},
            create: {
              conciliacaoId: conciliacao.id,
              metodo: 'AUTO',
              status: 'DIVERGENTE',
              valorFinal: valorFinal,
              idempotencyKey: `|DIVERGENTE|${hoje.toISOString().split('T')[0]}T00:00:00.000Z|${filialId}|${group.rede?.idempotencyKey}|${group.trier?.idempotencyKey}|${group.cielo?.codigoTransacao}`,
              ...(group.cielo?._sum.valorBruto && {
                valorCielo: group.cielo._sum.valorBruto,
              }),
              ...(group.rede?.valor && { valorRede: group.rede.valor }),
              ...(group.trier?.valor && { valorTrier: group.trier.valor }),
            },
          });
        }),
      );

      // Cria os itens correspondentes
      const itensDivergentes = gruposDivergentes.flatMap((grupo, idx) =>
        this.gerarItensParaGrupo(divergentes[idx], grupo.id),
      );
      if (itensDivergentes.length > 0) {
        const trierIds = [
          ...new Set(itensDivergentes.map((i) => i.trierId).filter(Boolean)),
        ];
        const redeIds = [
          ...new Set(itensDivergentes.map((i) => i.redeId).filter(Boolean)),
        ];
        const cieloIds = [
          ...new Set(itensDivergentes.map((i) => i.cieloId).filter(Boolean)),
        ];

        // 🔥 1. remove vínculos antigos
        await tx.conciliacaoItem.deleteMany({
          where: {
            OR: [
              { trierId: { in: trierIds } },
              { redeId: { in: redeIds } },
              { cieloId: { in: cieloIds } },
            ],
          },
        });

        // 🔥 2. cria novos itens
        await tx.conciliacaoItem.createMany({
          data: itensDivergentes,
        });

        // 🔥 3. atualiza status
        if (trierIds.length) {
          await tx.trierCartaoVendas.updateMany({
            where: { id: { in: trierIds } },
            data: { statusConciliacao: 'DIVERGENTE' },
          });
        }

        if (redeIds.length) {
          await tx.redeVenda.updateMany({
            where: { id: { in: redeIds } },
            data: { statusConciliacao: 'DIVERGENTE' },
          });
        }

        if (cieloIds.length) {
          await tx.cartaoVendas.updateMany({
            where: { id: { in: cieloIds } },
            data: { statusConciliacao: 'DIVERGENTE' },
          });
        }

        // 🔥 4. remove grupos vazios
        await tx.conciliacaoGrupo.deleteMany({
          where: {
            metodo: 'AUTO',
            OR: [{ status: 'DIVERGENTE' }, { status: 'PENDENTE' }],

            itens: {
              none: {},
            },
          },
        });
      }
    });
  }
}
