import { Inject, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/database/prisma.service';
import {
  ADQUIRENTE_BRASILCARD,
  ADQUIRENTE_CIELO,
  ADQUIRENTE_CIELO_PIX,
  ADQUIRENTE_INDEFINIDO,
  ADQUIRENTE_REDE,
  mapearBandeiraTrier,
} from './bandeira-adquirente.mapper';

interface ParcelaRef {
  trierParcelaId?: number;
  redeParcelaId?: number;
  cieloParcelaId?: number;
  valor: string;
}

interface ReceivableBucket {
  adquirente: string;
  itens: ParcelaRef[];
}

/**
 * Adquirentes cujos recebimentos NÃO são agrupados por vencimento: cada parcela
 * gera um recebimento individual no Trier (título com parcela e documento).
 */
const ADQUIRENTES_POR_PARCELA = new Set<string>([
  ADQUIRENTE_BRASILCARD,
  ADQUIRENTE_INDEFINIDO,
]);

@Injectable()
export class ReceivableGenerateService {
  @Inject()
  private readonly prisma: PrismaService;

  private toDate(date: string) {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private chaveAgrupada(filialId: number, adquirente: string, date: Date) {
    const dia = date.toISOString().slice(0, 10);
    return `RCV|GRP|${filialId}|${adquirente}|${dia}`;
  }

  private chavePorParcela(trierParcelaId: number) {
    return `RCV|PRC|${trierParcelaId}`;
  }

  /**
   * Agrupa parcelas vencidas na data alvo por (filialId, adquirente).
   * Rede usa suas próprias parcelas; Cielo usa as suas, separando PIX (CIELO PIX)
   * dos cartões (CIELO); Trier entra apenas para bandeiras sem fonte própria
   * (IFOOD/PAGGPIX/BRASILCARD), ignorando as demais. Parcelas de bandeira
   * não mapeada com statusConciliacao=NAO_ENCONTRADO (exceto PIX) entram como
   * INDEFINIDO. BRASILCARD e INDEFINIDO entram por parcela.
   */
  async groupByAdquirente(
    filialId: number,
    data: string,
  ): Promise<Map<string, ReceivableBucket>> {
    const date = this.toDate(data);

    const [redeParcelas, cieloParcelas, trierParcelas] = await Promise.all([
      this.prisma.redeParcela.findMany({
        where: { filialId, vencimento: date },
        select: {
          id: true,
          valorLiquido: true,
        },
      }),
      this.prisma.cieloParcela.findMany({
        where: { filialId, dataVencimento: date },
        select: {
          id: true,
          valorLiquido: true,
          modalidade: true,
        },
      }),
      this.prisma.trierParcela.findMany({
        where: { filialId, dataVencimento: date },
        select: {
          id: true,
          valorLiquido: true,
          bandeira: true,
          statusConciliacao: true,
        },
      }),
    ]);

    const buckets = new Map<string, ReceivableBucket>();

    const add = (adquirente: string, item: ParcelaRef) => {
      const bucket = buckets.get(adquirente) ?? {
        adquirente,
        itens: [],
      };
      bucket.itens.push(item);
      buckets.set(adquirente, bucket);
    };

    for (const p of redeParcelas) {
      add(ADQUIRENTE_REDE, {
        redeParcelaId: p.id,
        valor: p.valorLiquido.toString(),
      });
    }

    for (const p of cieloParcelas) {
      const adquirente =
        p.modalidade?.toLowerCase() === 'pix'
          ? ADQUIRENTE_CIELO_PIX
          : ADQUIRENTE_CIELO;
      add(adquirente, {
        cieloParcelaId: p.id,
        valor: p.valorLiquido.toString(),
      });
    }

    for (const p of trierParcelas) {
      let adquirente = mapearBandeiraTrier(p.bandeira ?? '');

      const bandeira = (p.bandeira ?? '').trim().toUpperCase();
      if (
        !adquirente &&
        p.statusConciliacao === 'NAO_ENCONTRADO' &&
        bandeira !== 'PIX'
      ) {
        adquirente = ADQUIRENTE_INDEFINIDO;
      }

      if (!adquirente) continue;
      if (adquirente === ADQUIRENTE_REDE || adquirente === ADQUIRENTE_CIELO) {
        continue;
      }
      add(adquirente, {
        trierParcelaId: p.id,
        valor: p.valorLiquido.toString(),
      });
    }

    return buckets;
  }

  /**
   * Gera (upsert) os recebimentos de uma filial para a data alvo.
   */
  async generateForFilial(filialId: number, data: string) {
    const buckets = await this.groupByAdquirente(filialId, data);
    const date = this.toDate(data);

    const resultados: {
      id: number;
      adquirente: string;
      valorEsperado: string;
      itens: number;
    }[] = [];

    const chaves = new Set<string>();

    await this.prisma.$transaction(async (tx) => {
      const antigos = await tx.receivable.findMany({
        where: { filialId, dataRecebimento: date },
        select: { id: true },
      });
      const antigosIds = antigos.map((r) => r.id);

      if (antigosIds.length) {
        await tx.redeParcela.updateMany({
          where: { receivableId: { in: antigosIds } },
          data: { receivableId: null },
        });
        await tx.cieloParcela.updateMany({
          where: { receivableId: { in: antigosIds } },
          data: { receivableId: null },
        });
        await tx.trierParcela.updateMany({
          where: { receivableId: { in: antigosIds } },
          data: { receivableId: null },
        });
      }

      for (const bucket of buckets.values()) {
        if (!bucket.itens.length) continue;

        if (ADQUIRENTES_POR_PARCELA.has(bucket.adquirente)) {
          for (const item of bucket.itens) {
            const trierParcelaId = item.trierParcelaId;
            if (trierParcelaId == null) continue;

            const valor = new Decimal(item.valor);
            const chave = this.chavePorParcela(trierParcelaId);

            const recebivel = await tx.receivable.upsert({
              where: { idempotencyKey: chave },
              update: { valorEsperado: valor },
              create: {
                idempotencyKey: chave,
                filialId,
                adquirente: bucket.adquirente,
                dataRecebimento: date,
                valorEsperado: valor,
              },
            });

            await tx.trierParcela.updateMany({
              where: { id: trierParcelaId },
              data: { receivableId: recebivel.id },
            });

            chaves.add(chave);
            resultados.push({
              id: recebivel.id,
              adquirente: bucket.adquirente,
              valorEsperado: valor.toString(),
              itens: 1,
            });
          }
          continue;
        }

        const total = bucket.itens.reduce(
          (acc, item) => acc.plus(new Decimal(item.valor)),
          new Decimal(0),
        );
        const chave = this.chaveAgrupada(filialId, bucket.adquirente, date);

        const recebivel = await tx.receivable.upsert({
          where: { idempotencyKey: chave },
          update: {
            valorEsperado: total,
          },
          create: {
            idempotencyKey: chave,
            filialId,
            adquirente: bucket.adquirente,
            dataRecebimento: date,
            valorEsperado: total,
          },
        });

        const redeIds = bucket.itens
          .map((item) => item.redeParcelaId)
          .filter((id): id is number => id != null);
        const cieloIds = bucket.itens
          .map((item) => item.cieloParcelaId)
          .filter((id): id is number => id != null);
        const trierIds = bucket.itens
          .map((item) => item.trierParcelaId)
          .filter((id): id is number => id != null);

        if (redeIds.length) {
          await tx.redeParcela.updateMany({
            where: { id: { in: redeIds } },
            data: { receivableId: recebivel.id },
          });
        }
        if (cieloIds.length) {
          await tx.cieloParcela.updateMany({
            where: { id: { in: cieloIds } },
            data: { receivableId: recebivel.id },
          });
        }
        if (trierIds.length) {
          await tx.trierParcela.updateMany({
            where: { id: { in: trierIds } },
            data: { receivableId: recebivel.id },
          });
        }

        chaves.add(chave);
        resultados.push({
          id: recebivel.id,
          adquirente: bucket.adquirente,
          valorEsperado: total.toString(),
          itens: bucket.itens.length,
        });
      }

      await tx.receivable.deleteMany({
        where: {
          filialId,
          dataRecebimento: date,
          adquirente: {
            in: [ADQUIRENTE_BRASILCARD, ADQUIRENTE_INDEFINIDO],
          },
          idempotencyKey: { notIn: [...chaves] },
          movimentoTrierId: null,
        },
      });
    });

    return resultados;
  }

  /**
   * Gera os recebimentos de todas as filiais para a data alvo.
   */
  async generate(data: string) {
    const filiais = await this.prisma.filial.findMany({ select: { id: true } });
    const resultados: {
      filialId: number;
      id: number;
      adquirente: string;
      valorEsperado: string;
      itens: number;
    }[] = [];

    for (const filial of filiais) {
      const porFilial = await this.generateForFilial(filial.id, data);
      for (const r of porFilial) {
        resultados.push({ filialId: filial.id, ...r });
      }
    }

    return resultados;
  }
}
