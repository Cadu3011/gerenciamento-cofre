import { Inject, Injectable, Logger } from '@nestjs/common';
import { ExtractParc } from './repository/extract-parc';
import { ConciliacaoParcMatch } from './conciliacao-parc.match';
import { ObservacaoConciliacao, Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { ConciliacaoGrupo } from './repository/contract';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

@Injectable()
export class ConciliacaoParcPipeline {
  private readonly logger = new Logger(ConciliacaoParcPipeline.name);

  @Inject()
  private readonly extract: ExtractParc;

  @Inject()
  private readonly matchService: ConciliacaoParcMatch;

  @Inject()
  private readonly prisma: PrismaService;

  async execute(date: string, filialId: number, context: JobExecutionContext, loteId: number) {
    let currentStep = '';
    try {
      currentStep = 'EXTRACT';
      context.startStep(currentStep);
      const { data } = await this.extract.execute(date, filialId);
      await context.endStep(
        currentStep,
        `Filial ${filialId} Data ${date} - Trier: ${data.trier.length}, Rede: ${data.rede.length}, Cielo: ${data.cielo.length}`,
      );

      currentStep = 'MATCH';
      context.startStep(currentStep);
      const grupos = this.matchService.match(data);
      const conciliados = grupos.filter((g) => g.status === 'CONCILIADO').length;
      const divergentes = grupos.filter((g) => g.status === 'DIVERGENTE').length;
      const naoEncontrados = grupos.filter((g) => g.status === 'NAO_ENCONTRADO').length;
      context.incrementExtracted(grupos.length);
      await context.endStep(
        currentStep,
        `Filial ${filialId} Data ${date} - ${grupos.length} grupos (${conciliados} C, ${divergentes} D, ${naoEncontrados} N)`,
      );

      currentStep = 'PERSIST';
      context.startStep(currentStep);
      await this.persistir(filialId, grupos, loteId, context);
      context.incrementInserted(conciliados + divergentes);
      await context.endStep(currentStep, `Filial ${filialId} Data ${date} - Persistência concluída`);

      return {
        total: grupos.length,
        conciliados,
        divergentes,
        naoEncontrados,
      };
    } catch (error: any) {
      context.error(currentStep, error?.message ?? 'Erro desconhecido');
      throw error;
    } finally {
      context.info('PIPELINE', `Pipeline encerrada`);
    }
  }

  private async persistir(
    filialId: number,
    grupos: ConciliacaoGrupo[],
    loteId: number,
    context: JobExecutionContext,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const conciliados = grupos.filter((g) => g.status === 'CONCILIADO');
      const divergentes = grupos.filter((g) => g.status === 'DIVERGENTE');
      const naoEncontrados = grupos.filter(
        (g) => g.status === 'NAO_ENCONTRADO',
      );

      const allGroups = [...conciliados, ...divergentes, ...naoEncontrados];

      const allTrierIds = allGroups.flatMap((g) => g.trierIds);
      const allRedeIds = [
        ...new Set(
          allGroups
            .flatMap((g) => g.itens.map((i) => i.redeParcelaId))
            .filter((id): id is number => id != null),
        ),
      ];
      const allCieloIds = [
        ...new Set(
          allGroups
            .flatMap((g) => g.itens.map((i) => i.cieloParcelaId))
            .filter((id): id is number => id != null),
        ),
      ];

      // 0. Coleta groupIds afetados ANTES de deletar as junctions
      const whereJunction = [
        ...(allTrierIds.length ? [{ trierParcelaId: { in: allTrierIds } }] : []),
        ...(allRedeIds.length ? [{ redeParcelaId: { in: allRedeIds } }] : []),
        ...(allCieloIds.length ? [{ cieloParcelaId: { in: allCieloIds } }] : []),
      ];

      const affectedGrupoIds = whereJunction.length
        ? [
            ...new Set(
              (await tx.conciliacaoParcelaItem.findMany({
                where: { OR: whereJunction },
                select: { conciliacaoParcelaId: true },
              })).map((j) => j.conciliacaoParcelaId),
            ),
          ]
        : [];

      // 1. Deleta junctions antigas para IDs sendo processados
      if (allTrierIds.length) {
        await tx.conciliacaoParcelaItem.deleteMany({
          where: { trierParcelaId: { in: allTrierIds } },
        });
      }
      if (allRedeIds.length) {
        await tx.conciliacaoParcelaItem.deleteMany({
          where: { redeParcelaId: { in: allRedeIds } },
        });
      }
      if (allCieloIds.length) {
        await tx.conciliacaoParcelaItem.deleteMany({
          where: { cieloParcelaId: { in: allCieloIds } },
        });
      }
      await context.info(
        'PERSIST',
        `Junctions deletadas: ${allTrierIds.length} trier, ${allRedeIds.length} rede, ${allCieloIds.length} cielo`,
      );

      // 2. Upsert grupos — key unificada com todos os items
      const gruposCriados = await Promise.all(
        allGroups.map((grupo) => {
          const allItemKeys = [
            ...grupo.trierIds.map((id) => `T${id}`),
            ...grupo.itens.map((i) =>
              i.redeParcelaId ? `R${i.redeParcelaId}` : `C${i.cieloParcelaId}`,
            ),
          ]
            .sort()
            .join(',');

          const key = `PARC|${filialId}|${allItemKeys}`;

          return tx.conciliacaoParcela.upsert({
            where: { idempotencyKey: key },
            update: {
              status: grupo.status,
              tipoMatch: grupo.tipoMatch,
              observacao: grupo.observacao,
            },
            create: {
              status: grupo.status,
              tipoMatch: grupo.tipoMatch,
              observacao: grupo.observacao,
              idempotencyKey: key,
              conciliacaoLoteId: loteId,
            },
          });
        }),
      );
      await context.info(
        'PERSIST',
        `Grupos upserted: ${gruposCriados.length} total`,
      );

      // 3. Cria junctions novas — Trier, Rede e Cielo todos via ConciliacaoParcelaItem
      const allItemJunctions = allGroups.flatMap((grupo, idx) => {
        const trierItems = grupo.trierIds.map((trierId) => ({
          conciliacaoParcelaId: gruposCriados[idx].id,
          trierParcelaId: trierId,
          redeParcelaId: null as number | null,
          cieloParcelaId: null as number | null,
          origem: 'TRIER' as const,
        }));

        const rcItems = grupo.itens.map((item) => ({
          conciliacaoParcelaId: gruposCriados[idx].id,
          trierParcelaId: null as number | null,
          redeParcelaId: item.redeParcelaId ?? null,
          cieloParcelaId: item.cieloParcelaId ?? null,
          origem: (item.redeParcelaId ? 'REDE' : 'CIELO') as 'REDE' | 'CIELO',
        }));

        return [...trierItems, ...rcItems];
      });

      if (allItemJunctions.length) {
        await tx.conciliacaoParcelaItem.createMany({
          data: allItemJunctions,
        });
      }
      await context.info(
        'PERSIST',
        `Junctions criadas: ${allItemJunctions.length} items`,
      );

      // 4. Cria observações de divergência para cada grupo
      const observacoes: { conciliacaoParcelaId: number; tipo: ObservacaoConciliacao }[] = [];

      for (const [idx, grupo] of allGroups.entries()) {
        const parcelaId = gruposCriados[idx].id;
        const divergencias = new Set<ObservacaoConciliacao>();

        if (grupo.status === 'NAO_ENCONTRADO') {
          divergencias.add('PARCELAS_NAO_ENCONTRADAS');
        }

        for (const item of grupo.itens) {
          if (item.divergenciaValor) divergencias.add('DIVERGENCIA_VALOR' as ObservacaoConciliacao);
          if (item.divergenciaVencimento) divergencias.add('DIVERGENCIA_VENCIMENTO' as ObservacaoConciliacao);
          if (item.divergenciaValorLiquido) divergencias.add('DIVERGENCIA_VALOR_LIQUIDO' as ObservacaoConciliacao);
          if (item.divergenciaParcelas) divergencias.add('DIVERGENCIA_QUANTIDADE_PARCELAS' as ObservacaoConciliacao);
        }

        for (const tipo of divergencias) {
          observacoes.push({ conciliacaoParcelaId: parcelaId, tipo });
        }
      }

      if (observacoes.length) {
        await tx.conciliacaoParcelaObservacao.createMany({
          data: observacoes,
        });
      }
      await context.info(
        'PERSIST',
        `Observações criadas: ${observacoes.length} registros`,
      );

      // 5. Atualiza status nas fontes
      const trierConciliados = conciliados.flatMap((g) => g.trierIds);
      const trierDivergentes = divergentes.flatMap((g) => g.trierIds);
      const trierNaoEncontrados = naoEncontrados.flatMap((g) => g.trierIds);

      if (trierConciliados.length) {
        await tx.trierParcela.updateMany({
          where: { id: { in: trierConciliados } },
          data: { statusConciliacao: 'CONCILIADO' },
        });
      }
      if (trierDivergentes.length) {
        await tx.trierParcela.updateMany({
          where: { id: { in: trierDivergentes } },
          data: { statusConciliacao: 'DIVERGENTE' },
        });
      }
      if (trierNaoEncontrados.length) {
        await tx.trierParcela.updateMany({
          where: { id: { in: trierNaoEncontrados } },
          data: { statusConciliacao: 'NAO_ENCONTRADO' },
        });
      }

      if (allRedeIds.length) {
        await this.atualizarStatusAdquirente(tx, 'rede', allRedeIds);
      }
      if (allCieloIds.length) {
        await this.atualizarStatusAdquirente(tx, 'cielo', allCieloIds);
      }
      await context.info(
        'PERSIST',
        `Status atualizados: ${trierConciliados.length + trierDivergentes.length + trierNaoEncontrados.length} trier, ${allRedeIds.length} rede, ${allCieloIds.length} cielo`,
      );

      // 6. Limpa grupos órfãos (apenas os afetados por esta execução)
      if (affectedGrupoIds.length) {
        const orfosDeletados = await tx.conciliacaoParcela.deleteMany({
          where: {
            id: { in: affectedGrupoIds },
            itens: { none: {} },
          },
        });
        await context.info('PERSIST', `Órfãos limpos: ${orfosDeletados.count} registros`);
      }
    }, { timeout: 60000 });
  }

  private async atualizarStatusAdquirente(
    tx: Prisma.TransactionClient,
    tabela: 'rede' | 'cielo',
    ids: number[],
  ) {
    if (tabela === 'rede') {
      const itens = await tx.conciliacaoParcelaItem.findMany({
        where: { redeParcelaId: { in: ids } },
        select: {
          redeParcelaId: true,
          conciliacaoParcela: { select: { status: true } },
        },
      });

      const statusMap = new Map<number, string>();
      for (const item of itens) {
        if (!item.redeParcelaId) continue;
        statusMap.set(item.redeParcelaId, item.conciliacaoParcela.status);
      }

      const conciliados = [...statusMap.entries()]
        .filter(([, v]) => v === 'CONCILIADO')
        .map(([k]) => k);
      const divergentes = [...statusMap.entries()]
        .filter(([, v]) => v === 'DIVERGENTE')
        .map(([k]) => k);
      const naoEncontrados = [...statusMap.entries()]
        .filter(([, v]) => v === 'NAO_ENCONTRADO')
        .map(([k]) => k);

      if (conciliados.length) {
        await tx.redeParcela.updateMany({
          where: { id: { in: conciliados } },
          data: { statusConciliacao: 'CONCILIADO' },
        });
      }
      if (divergentes.length) {
        await tx.redeParcela.updateMany({
          where: { id: { in: divergentes } },
          data: { statusConciliacao: 'DIVERGENTE' },
        });
      }
      if (naoEncontrados.length) {
        await tx.redeParcela.updateMany({
          where: { id: { in: naoEncontrados } },
          data: { statusConciliacao: 'NAO_ENCONTRADO' },
        });
      }
    } else {
      const itens = await tx.conciliacaoParcelaItem.findMany({
        where: { cieloParcelaId: { in: ids } },
        select: {
          cieloParcelaId: true,
          conciliacaoParcela: { select: { status: true } },
        },
      });

      const statusMap = new Map<number, string>();
      for (const item of itens) {
        if (!item.cieloParcelaId) continue;
        statusMap.set(item.cieloParcelaId, item.conciliacaoParcela.status);
      }

      const conciliados = [...statusMap.entries()]
        .filter(([, v]) => v === 'CONCILIADO')
        .map(([k]) => k);
      const divergentes = [...statusMap.entries()]
        .filter(([, v]) => v === 'DIVERGENTE')
        .map(([k]) => k);
      const naoEncontrados = [...statusMap.entries()]
        .filter(([, v]) => v === 'NAO_ENCONTRADO')
        .map(([k]) => k);

      if (conciliados.length) {
        await tx.cieloParcela.updateMany({
          where: { id: { in: conciliados } },
          data: { statusConciliacao: 'CONCILIADO' },
        });
      }
      if (divergentes.length) {
        await tx.cieloParcela.updateMany({
          where: { id: { in: divergentes } },
          data: { statusConciliacao: 'DIVERGENTE' },
        });
      }
      if (naoEncontrados.length) {
        await tx.cieloParcela.updateMany({
          where: { id: { in: naoEncontrados } },
          data: { statusConciliacao: 'NAO_ENCONTRADO' },
        });
      }
    }
  }
}
