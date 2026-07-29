import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { ConciliacaoParcPipeline } from './cron/conciliacao-parc.pipeline';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

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
    if (item.redeParcela) {
      return {
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
      };
    }
    if (item.cieloParcela) {
      return {
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
      };
    }
    return null;
  }

  private mapGrupo(c: any) {
    const trierItems = c.itens.filter((i: any) => i.trierParcela);
    const rcItems = c.itens.filter((i: any) => i.redeParcela || i.cieloParcela);
    const observacoes = c.observacoes?.map((o: any) => o.tipo) ?? [];

    return {
      id: c.id,
      status: c.status,
      tipoMatch: c.tipoMatch,
      score: c.score,
      observacao: c.observacao,
      observacoes,
      createdAt: c.createdAt,
      triers: trierItems.map((i: any) => this.mapTrier(i.trierParcela)),
      itens: rcItems.map((item: any) => this.mapItem(item)).filter(Boolean),
    };
  }

  private buildOrFilter(filialId: number, start: Date, end: Date) {
    return {
      itens: {
        some: {
          OR: [
            {
              trierParcela: {
                filialId,
                dataEmissao: { gte: start, lte: end },
              },
            },
            {
              redeParcela: {
                filialId,
                dataVenda: { gte: start, lte: end },
              },
            },
            {
              cieloParcela: {
                filialId,
                dataVenda: { gte: start, lte: end },
              },
            },
          ],
        },
      },
    };
  }

  private includeAll() {
    return {
      itens: {
        include: {
          trierParcela: true,
          redeParcela: true,
          cieloParcela: true,
        },
      },
      observacoes: true,
    };
  }

  async findByDate(filialId: number, date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const conciliacoes = await this.prisma.conciliacaoParcela.findMany({
      where: this.buildOrFilter(filialId, start, end),
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
        ...this.buildOrFilter(filialId, start, end),
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

    const hasFilial = c.itens.some(
      (i: any) =>
        i.trierParcela?.filialId === filialId ||
        i.redeParcela?.filialId === filialId ||
        i.cieloParcela?.filialId === filialId,
    );
    if (!hasFilial) return null;

    return this.mapGrupo(c);
  }

  async totalsDia(filialId: number, dateRange: { from: string; to: string }) {
    const start = new Date(`${dateRange.from}T00:00:00.000Z`);
    const end = new Date(`${dateRange.to}T23:59:59.999Z`);

    const registros = await this.prisma.conciliacaoParcela.findMany({
      where: this.buildOrFilter(filialId, start, end),
      include: {
        itens: {
          include: {
            trierParcela: {
              select: { dataEmissao: true, valor: true, valorLiquido: true, valorTaxas: true, filialId: true },
            },
            redeParcela: {
              select: { valor: true, valorLiquido: true, taxa: true, dataVenda: true, filialId: true },
            },
            cieloParcela: {
              select: { valor: true, valorLiquido: true, dataVenda: true, filialId: true },
            },
          },
        },
        observacoes: true,
      },
    });

    const resultado: Record<
      string,
      { data: string; conciliados: number; divergentes: number; naoEncontrados: number; totalValor: number; totalValorLiquido: number; totalTaxas: number }
    > = {};

    for (const c of registros) {
      const dataRef =
        c.itens.find((i: any) => i.trierParcela?.filialId === filialId)?.trierParcela?.dataEmissao ??
        c.itens.find((i: any) => i.cieloParcela?.filialId === filialId)?.cieloParcela?.dataVenda ??
        c.itens.find((i: any) => i.redeParcela?.filialId === filialId)?.redeParcela?.dataVenda;
      if (!dataRef) continue;

      const dia = new Date(dataRef).toISOString().slice(0, 10);

      if (!resultado[dia]) {
        resultado[dia] = { data: dia, conciliados: 0, divergentes: 0, naoEncontrados: 0, totalValor: 0, totalValorLiquido: 0, totalTaxas: 0 };
      }

      for (const it of c.itens) {
        if (it.trierParcela && it.trierParcela.filialId === filialId) {
          resultado[dia].totalValor += Number(it.trierParcela.valor);
          resultado[dia].totalValorLiquido += Number(it.trierParcela.valorLiquido);
          resultado[dia].totalTaxas += Number(it.trierParcela.valorTaxas ?? 0);
        }
        if (it.redeParcela && it.redeParcela.filialId === filialId) {
          resultado[dia].totalTaxas += Number(it.redeParcela.taxa ?? 0);
        }
        if (it.cieloParcela && it.cieloParcela.filialId === filialId) {
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
        ...this.buildOrFilter(filialId, start, end),
      },
      _count: true,
    });

    return result._count;
  }

  async execute(filialId: number, date: string) {
    const dateObj = new Date(`${date}T00:00:00.000Z`);

    const lote = await this.prisma.conciliacaoLote.create({
      data: {
        periodoInicial: dateObj,
        periodoFinal: dateObj,
        algoritmoVersao: '1.0',
      },
    });

    const context = new JobExecutionContext();
    return this.pipeline.execute(date, filialId, context, lote.id);
  }
}
