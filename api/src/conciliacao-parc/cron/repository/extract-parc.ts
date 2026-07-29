import { Inject, Injectable, Logger } from '@nestjs/common';
import { StatusConciliacao } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { Data } from './contract';

const EXCLUDED_BANDERAS = ['PAGAMENTO ONLINE IFOOD', 'PIX SEGURO - PAGGPIX'];

@Injectable()
export class ExtractParc {
  @Inject()
  private readonly prisma: PrismaService;

  private readonly logger = new Logger(ExtractParc.name);

  async execute(date: string, filialId: number): Promise<{ data: Data }> {
    const dateFormat = new Date(`${date}T00:00:00.000Z`);

    const [trier, rede, cielo] = await Promise.all([
      this.prisma.trierParcela.findMany({
        where: {
          filialId,
          dataEmissao: dateFormat,
          bandeira: {
            notIn: ['PAGAMENTO ONLINE IFOOD', 'PIX SEGURO - PAGGPIX'],
          },
        },
      }),

      this.prisma.redeParcela.findMany({
        where: {
          filialId,
          dataVenda: dateFormat,
        },
      }),

      this.prisma.cieloParcela.findMany({
        where: {
          filialId,
          dataVenda: dateFormat,
        },
      }),
    ]);

    const conciliacoesVenda = await this.prisma.conciliacaoGrupo.findMany({
      where: {
        status: StatusConciliacao.CONCILIADO,
        conciliacao: {
          filialId,
        },
        itens: {
          some: {
            dataReferencia: dateFormat,
            trier: {
              bandeira: {
                notIn: ['PAGAMENTO ONLINE IFOOD', 'PIX SEGURO - PAGGPIX'],
              },
            },
          },
        },
      },
      select: {
        itens: {
          select: {
            trierId: true,
            redeId: true,
            cieloId: true,
            dataReferencia: true,
            trier: { select: { bandeira: true } },
          },
        },
      },
    });

    const trierVendaIds = new Set<number>();
    const redeVendaIds = new Set<number>();
    const cieloVendaIds = new Set<number>();

    for (const grupo of conciliacoesVenda) {
      for (const item of grupo.itens) {
        if (!item.dataReferencia) continue;
        if (item.trier && EXCLUDED_BANDERAS.includes(item.trier.bandeira)) continue;

        if (item.trierId) trierVendaIds.add(item.trierId);
        if (item.redeId) redeVendaIds.add(item.redeId);
        if (item.cieloId) cieloVendaIds.add(item.cieloId);
      }
    }

    const trierExistentes = new Set(trier.map((x) => x.id));
    const redeExistentes = new Set(rede.map((x) => x.id));
    const cieloExistentes = new Set(cielo.map((x) => x.id));

    const [trierExtras, redeExtras, cieloExtras] = await Promise.all([
      trierVendaIds.size
        ? this.prisma.trierParcela.findMany({
            where: {
              filialId,
              vendaId: {
                in: [...trierVendaIds],
              },
              bandeira: {
                notIn: ['PAGAMENTO ONLINE IFOOD', 'PIX SEGURO - PAGGPIX'],
              },
            },
          })
        : Promise.resolve([]),

      redeVendaIds.size
        ? this.prisma.redeParcela.findMany({
            where: {
              filialId,
              vendaId: {
                in: [...redeVendaIds],
              },
            },
          })
        : Promise.resolve([]),

      cieloVendaIds.size
        ? this.prisma.cieloParcela.findMany({
            where: {
              filialId,
              vendaId: {
                in: [...cieloVendaIds],
              },
            },
          })
        : Promise.resolve([]),
    ]);

    let trierNovas = 0;
    for (const parcela of trierExtras) {
      if (!trierExistentes.has(parcela.id)) {
        trierExistentes.add(parcela.id);
        trier.push(parcela);
        trierNovas++;
      }
    }

    let redeNovas = 0;
    for (const parcela of redeExtras) {
      if (!redeExistentes.has(parcela.id)) {
        redeExistentes.add(parcela.id);
        rede.push(parcela);
        redeNovas++;
      }
    }

    let cieloNovas = 0;
    for (const parcela of cieloExtras) {
      if (!cieloExistentes.has(parcela.id)) {
        cieloExistentes.add(parcela.id);
        cielo.push(parcela);
        cieloNovas++;
      }
    }

    const filteredTrier = trier.filter(
      (t) => !EXCLUDED_BANDERAS.includes(t.bandeira),
    );

    return {
      data: {
        trier: filteredTrier,
        rede,
        cielo,
        conciliacoesVenda,
      },
    };
  }
}
