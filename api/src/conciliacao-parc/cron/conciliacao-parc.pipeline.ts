import { Inject, Injectable, Logger } from '@nestjs/common';
import { ExtractParc } from './repository/extract-parc';
import { ConciliacaoParcMatch } from './conciliacao-parc.match';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { ConciliacaoGrupo } from './repository/contract';

@Injectable()
export class ConciliacaoParcPipeline {
  private readonly logger = new Logger(ConciliacaoParcPipeline.name);

  @Inject()
  private readonly extract: ExtractParc;

  @Inject()
  private readonly matchService: ConciliacaoParcMatch;

  @Inject()
  private readonly prisma: PrismaService;

  async execute(date: string, filialId: number) {
    const { data } = await this.extract.execute(date, filialId);
    const grupos = this.matchService.match(data);

    this.logger.log(
      `Filial ${filialId} Data ${date} - ${grupos.length} grupos processados`,
    );

    await this.persistir(filialId, grupos);

    return {
      total: grupos.length,
      conciliados: grupos.filter((g) => g.status === 'CONCILIADO').length,
      divergentes: grupos.filter((g) => g.status === 'DIVERGENTE').length,
      naoEncontrados: grupos.filter((g) => g.status === 'NAO_ENCONTRADO')
        .length,
    };
  }

  private async persistir(filialId: number, grupos: ConciliacaoGrupo[]) {
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

      // 1. Deleta junctions antigas para IDs sendo processados
      if (allTrierIds.length) {
        await tx.conciliacaoParcelaTrier.deleteMany({
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

      // 2. Limpa grupos órfãos (sem nenhuma junction restante)
      await tx.conciliacaoParcela.deleteMany({
        where: {
          AND: [{ trierItens: { none: {} } }, { itens: { none: {} } }],
        },
      });

      // 3. Upsert grupos — key sem status para evitar órfãos
      const gruposCriados = await Promise.all(
        allGroups.map((grupo) => {
          const trierKey = grupo.trierIds.sort().join(',');
          const redeKey = grupo.itens
            .map((i) => i.redeParcelaId)
            .filter((id): id is number => id != null)
            .sort()
            .join(',');
          const cieloKey = grupo.itens
            .map((i) => i.cieloParcelaId)
            .filter((id): id is number => id != null)
            .sort()
            .join(',');

          const key = `PARC|${filialId}|${trierKey}|${redeKey}|${cieloKey}`;

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
            },
          });
        }),
      );

      // 4. Cria junctions novas
      const trierJunctions = allGroups.flatMap((grupo, idx) =>
        grupo.trierIds.map((trierId) => ({
          conciliacaoParcelaId: gruposCriados[idx].id,
          trierParcelaId: trierId,
          idempotencyKey: `PARC_T|${filialId}|${trierId}`,
        })),
      );
      if (trierJunctions.length) {
        await tx.conciliacaoParcelaTrier.createMany({
          data: trierJunctions,
          skipDuplicates: true,
        });
      }

      const itemJunctions = allGroups.flatMap((grupo, idx) =>
        grupo.itens.map((item) => ({
          conciliacaoParcelaId: gruposCriados[idx].id,
          redeParcelaId: item.redeParcelaId ?? null,
          cieloParcelaId: item.cieloParcelaId ?? null,
          tipoMatch: item.tipoMatch,
          idempotencyKey: item.redeParcelaId
            ? `PARC_R|${filialId}|${item.redeParcelaId}`
            : `PARC_C|${filialId}|${item.cieloParcelaId}`,
          divergenciaValor: item.divergenciaValor,
          divergenciaVencimento: item.divergenciaVencimento,
          divergenciaValorLiquido: item.divergenciaValorLiquido,
          divergenciaParcelas: item.divergenciaParcelas,
          divergenciaModalidade: item.divergenciaModalidade,
          divergenciaBandeira: item.divergenciaBandeira,
        })),
      );
      if (itemJunctions.length) {
        await tx.conciliacaoParcelaItem.createMany({
          data: itemJunctions,
          skipDuplicates: true,
        });
      }

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
    });

    this.logger.log(`Filial ${filialId} - Persistência concluída`);
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
