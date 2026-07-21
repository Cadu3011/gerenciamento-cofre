import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { ConciliacaoParcPipeline } from './cron/conciliacao-parc.pipeline';

@Injectable()
export class ConciliacaoParcService {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly pipeline: ConciliacaoParcPipeline;

  private mapTrier(t: any) {
    return {
      id: t.id,
      documentoFiscal: t.documentoFiscal,
      nsuAdministradora: t.nsuAdministradora,
      modalidadeVenda: t.modalidadeVenda,
      bandeira: t.bandeira,
      parcela: t.parcela,
      totalParcelas: t.totalParcelas,
      dataEmissao: t.dataEmissao,
      dataVencimento: t.dataVencimento,
      valor: t.valor,
      valorLiquido: t.valorLiquido,
      taxa: String(t.valorTaxas ?? 0),
      statusConciliacao: t.statusConciliacao,
    };
  }

  private mapItem(item: any) {
    const outra = item.redeParcela
      ? {
          origem: 'REDE' as const,
          id: item.redeParcela.id,
          nsu: item.redeParcela.nsu,
          parcela: item.redeParcela.parcela,
          totalParcelas: item.redeParcela.totalParcelas,
          dataVenda: item.redeParcela.dataVenda,
          vencimento: item.redeParcela.vencimento,
          valor: item.redeParcela.valor,
          valorLiquido: item.redeParcela.valorLiquido,
          taxa: String(item.redeParcela.taxa ?? 0),
          statusConciliacao: item.redeParcela.statusConciliacao,
        }
      : item.cieloParcela
        ? {
            origem: 'CIELO' as const,
            id: item.cieloParcela.id,
            nsu: item.cieloParcela.nsu,
            codigoTransacao: item.cieloParcela.codigoTransacao,
            modalidade: item.cieloParcela.modalidade,
            bandeira: item.cieloParcela.bandeira,
            parcela: item.cieloParcela.parcela,
            totalParcelas: item.cieloParcela.totalParcelas,
            dataVenda: item.cieloParcela.dataVenda,
            dataVencimento: item.cieloParcela.dataVencimento,
            valor: item.cieloParcela.valor,
            valorLiquido: item.cieloParcela.valorLiquido,
            taxa: String(
              Number(item.cieloParcela.valor) -
                Number(item.cieloParcela.valorLiquido),
            ),
            statusConciliacao: item.cieloParcela.statusConciliacao,
          }
        : null;

    return {
      id: item.id,
      tipoMatch: item.tipoMatch,
      divergenciaValor: item.divergenciaValor,
      divergenciaVencimento: item.divergenciaVencimento,
      divergenciaValorLiquido: item.divergenciaValorLiquido,
      divergenciaParcelas: item.divergenciaParcelas,
      divergenciaModalidade: item.divergenciaModalidade,
      divergenciaBandeira: item.divergenciaBandeira,
      outra,
    };
  }

  private mapGrupo(c: any) {
    return {
      id: c.id,
      status: c.status,
      tipoMatch: c.tipoMatch,
      observacao: c.observacao,
      createdAt: c.createdAt,
      triers: (c.trierItens || []).map((ti: any) =>
        this.mapTrier(ti.trierParcela),
      ),
      itens: (c.itens || []).map((item: any) => this.mapItem(item)),
    };
  }

  private buildOrFilter(filialId: number, start: Date, end: Date) {
    return [
      {
        trierItens: {
          some: {
            trierParcela: {
              filialId,
              dataEmissao: { gte: start, lte: end },
            },
          },
        },
      },
      {
        itens: {
          some: {
            redeParcela: {
              filialId,
              dataVenda: { gte: start, lte: end },
            },
          },
        },
      },
      {
        itens: {
          some: {
            cieloParcela: {
              filialId,
              dataVenda: { gte: start, lte: end },
            },
          },
        },
      },
    ];
  }

  private includeAll() {
    return {
      trierItens: {
        include: { trierParcela: true },
      },
      itens: {
        include: {
          redeParcela: true,
          cieloParcela: true,
        },
      },
    };
  }

  async findByDate(filialId: number, date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const conciliacoes = await this.prisma.conciliacaoParcela.findMany({
      where: { OR: this.buildOrFilter(filialId, start, end) },
      include: this.includeAll(),
      orderBy: { createdAt: 'desc' },
    });

    return conciliacoes.map((c) => this.mapGrupo(c));
  }

  async findByDateDivergentes(
    filialId: number,
    dateRange: { from: string; to: string },
  ) {
    const start = new Date(`${dateRange.from}T00:00:00.000Z`);
    const end = new Date(`${dateRange.to}T23:59:59.999Z`);

    const conciliacoes = await this.prisma.conciliacaoParcela.findMany({
      where: {
        status: 'DIVERGENTE',
        OR: this.buildOrFilter(filialId, start, end),
      },
      include: this.includeAll(),
      orderBy: { createdAt: 'desc' },
    });

    return conciliacoes.map((c) => this.mapGrupo(c));
  }

  async findByDateConciliados(filialId: number, conciliacaoId: number) {
    const c = await this.prisma.conciliacaoParcela.findUnique({
      where: { id: conciliacaoId },
      include: this.includeAll(),
    });

    if (!c) return null;

    const hasFilial = c.trierItens.some(
      (ti: any) => ti.trierParcela?.filialId === filialId,
    );
    if (!hasFilial) return null;

    return this.mapGrupo(c);
  }

  async totalsDia(filialId: number, dateRange: { from: string; to: string }) {
    const start = new Date(`${dateRange.from}T00:00:00.000Z`);
    const end = new Date(`${dateRange.to}T23:59:59.999Z`);

    const registros = await this.prisma.conciliacaoParcela.findMany({
      where: { OR: this.buildOrFilter(filialId, start, end) },
      include: {
        trierItens: {
          include: {
            trierParcela: { select: { dataEmissao: true, valor: true, valorLiquido: true, valorTaxas: true } },
          },
        },
        itens: {
          include: {
            redeParcela: { select: { valor: true, valorLiquido: true, taxa: true, dataVenda: true } },
            cieloParcela: { select: { valor: true, valorLiquido: true, dataVenda: true } },
          },
        },
      },
    });

    const resultado: Record<
      string,
      { data: string; conciliados: number; divergentes: number; naoEncontrados: number; totalValor: number; totalValorLiquido: number; totalTaxas: number }
    > = {};

    for (const c of registros) {
      const dataRef =
        c.trierItens[0]?.trierParcela?.dataEmissao ??
        c.itens[0]?.cieloParcela?.dataVenda ??
        c.itens[0]?.redeParcela?.dataVenda;
      if (!dataRef) continue;

      const dia = new Date(dataRef).toISOString().slice(0, 10);

      if (!resultado[dia]) {
        resultado[dia] = { data: dia, conciliados: 0, divergentes: 0, naoEncontrados: 0, totalValor: 0, totalValorLiquido: 0, totalTaxas: 0 };
      }

      for (const ti of c.trierItens) {
        if (ti.trierParcela) {
          resultado[dia].totalValor += Number(ti.trierParcela.valor);
          resultado[dia].totalValorLiquido += Number(ti.trierParcela.valorLiquido);
          resultado[dia].totalTaxas += Number(ti.trierParcela.valorTaxas ?? 0);
        }
      }

      for (const it of c.itens) {
        if (it.redeParcela) {
          resultado[dia].totalTaxas += Number(it.redeParcela.taxa ?? 0);
        }
        if (it.cieloParcela) {
          resultado[dia].totalTaxas +=
            Number(it.cieloParcela.valor) - Number(it.cieloParcela.valorLiquido);
        }
      }

      if (c.status === 'CONCILIADO') {
        resultado[dia].conciliados++;
      } else if (c.status === 'DIVERGENTE') {
        resultado[dia].divergentes++;
      } else if (c.status === 'NAO_ENCONTRADO') {
        resultado[dia].naoEncontrados++;
      }
    }

    return Object.values(resultado).sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    );
  }

  async totalDiferencaDia(filialId: number, date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const result = await this.prisma.conciliacaoParcela.aggregate({
      where: {
        status: { not: 'CONCILIADO' },
        OR: this.buildOrFilter(filialId, start, end),
      },
      _count: true,
    });

    return result._count;
  }

  async execute(filialId: number, date: string) {
    return this.pipeline.execute(date, filialId);
  }
}
