import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';
import { TrierApiClient } from '../../infra/http/trier-api.client';
import {
  DevolucaoExtracted,
  DevolucaoTransformResult,
  DevolucaoTransformada,
} from '../contracts/trier.devolucao.types';

/**
 * Bandeira atribuída à devolução cuja venda original não foi localizada.
 *
 * O texto é o mesmo que a origem devolve em `nomeCartao`, capitalização e
 * espaçamento inclusive, para casar com as bandeiras que já estão no banco e
 * não criar um grupo à parte no filtro do dashboard.
 */
const BANDEIRA_SEM_VENDA_ORIGEM = 'PIX SEGURO - PAGGPIX';

/**
 * Resolve a bandeira de cada devolução a partir da venda que ela cancela.
 *
 * O estorno da origem não traz bandeira. A origem entrega `numeroNotaOrigem`
 * e `dataEmissaoOrigem`, e é por aí que a venda é recuperada, em dois
 * caminhos:
 *
 *  1. `TrierCartaoVendas` por (documentoFiscal, filialId) — o ETL de cartões
 *     já carregou a venda original, então a consulta é local e de graça.
 *  2. Quando a venda não está no banco (ainda não carregada, ou fora da
 *     janela do ETL), uma chamada à origem para a data da venda original,
 *     montando `documentoFiscal -> nomeCartao`. As chamadas são agrupadas por
 *     data, então várias devoluções da mesma data custam uma requisição só.
 *
 * Devolução que não resolve marca por nenhum dos dois caminhos cai em
 * `PIX SEGURO - PAGGPIX`. Isso não é palpite: o ETL de cartões descarta
 * `codigoCartao === 34` por regra de negócio
 * (`cardETL/trier/transform/trier.cardTransform.ts:47,99`), então nenhuma venda
 * de PIX SEGURO chega a `TrierCartaoVendas`. Consultando a origem para as
 * 98 devoluções sem marca, todas as 98 responderam `codigoCartao: 34` /
 * `PIX SEGURO - PAGGPIX` na venda original. Sem essa regra elas ficariam no
 * bucket vazio do dashboard, que é justamente o que o trabalho removes.
 *
 * `vendaId` não serve de discriminador aqui: ele aponta para a venda de tipo
 * DEVOLUCAO, que tem bandeira vazia por construção, e 21 das 98 sem marca têm
 * `vendaId` preenchido. O que isola o problema é a falta da venda ORIGINAL.
 */
@Injectable()
export class TrierDevolucaoTransform {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly trierApiClient: TrierApiClient;

  async execute(
    devolucoes: DevolucaoExtracted[],
    tokenLocalTrier: string,
  ): Promise<DevolucaoTransformResult> {
    if (!devolucoes.length) {
      return { linhas: [], naoResolvidas: [], chamadasOrigem: 0 };
    }

    const { bandeiras, chamadasOrigem } = await this.resolverBandeiras(
      devolucoes,
      tokenLocalTrier,
    );

    const linhas: DevolucaoTransformada[] = [];
    const naoResolvidas: DevolucaoTransformResult['naoResolvidas'] = [];

    for (const dev of devolucoes) {
      const documentoDevolucao = Number(dev.numeroNotaDevolucao);
      const numeroNotaOrigem = Number(dev.numeroNotaOrigem);
      const valor = -Math.abs(Number(dev.totalNotaDevolucao));

      const bandeiraResolvida = bandeiras.get(
        this.chave(dev.filialId, numeroNotaOrigem),
      );

      // Cai aqui só quando a venda original não foi encontrada nem no banco
      // nem na origem.
      if (!bandeiraResolvida) {
        naoResolvidas.push({
          documentoDevolucao,
          numeroNotaOrigem,
          dataEmissaoOrigem: dev.dataEmissaoOrigem,
          valor,
        });
      }

      linhas.push({
        filialId: dev.filialId,

        documentoFiscal: documentoDevolucao,
        documentoFiscalEstorno: numeroNotaOrigem,

        dataEmissao: dev.dataEmissaoDevolucao,
        dataVencimento: dev.dataEmissaoDevolucao,

        valor,
        valorLiquido: valor,
        valorTaxas: 0,

        bandeira: bandeiraResolvida ?? BANDEIRA_SEM_VENDA_ORIGEM,

        nsuAdministradora: '',
        prazoVenda: '',
        modalidadeVenda: null,
        administradoraCartao: '',
        parcela: 1,
        totalParcelas: 1,
      });
    }

    return {
      linhas,
      naoResolvidas,
      chamadasOrigem,
    };
  }

  private chave(filialId: number, documento: number) {
    return `${filialId}:${documento}`;
  }

  private async resolverBandeiras(
    devolucoes: DevolucaoExtracted[],
    tokenLocalTrier: string,
  ) {
    const origemPorChave = new Map<string, number>();

    for (const dev of devolucoes) {
      origemPorChave.set(
        this.chave(dev.filialId, Number(dev.numeroNotaOrigem)),
        dev.filialId,
      );
    }

    const porFilial = new Map<number, number[]>();
    for (const [chave, filialId] of origemPorChave) {
      const documento = Number(chave.split(':')[1]);
      const lista = porFilial.get(filialId) ?? [];
      lista.push(documento);
      porFilial.set(filialId, lista);
    }

    const bandeiras = new Map<string, string>();
    let chamadasOrigem = 0;

    // Caminho 1: banco local.
    //
    // `tipo: 'VENDA'` é explícito porque a mesma filial pode ter uma VENDA e
    // uma DEVOLUCAO com o mesmo `documentoFiscal` — a DEVOLUCAO sempre tem
    // bandeira vazia, então sem o filtro ela, dependendo da ordem do banco,
    // poderia "vencer" e apagar uma marca já resolvida. Medido hoje: 0
    // documentos ambíguos, mas o filtro deixa o comportamento garantido em vez
    // de acidental.
    for (const [filialId, documentos] of porFilial) {
      const vendas = await this.prisma.trierCartaoVendas.findMany({
        where: {
          filialId,
          documentoFiscal: { in: documentos },
          tipo: 'VENDA',
        },
        select: { documentoFiscal: true, bandeira: true },
      });

      for (const venda of vendas) {
        if (!venda.bandeira) continue;
        bandeiras.set(
          this.chave(filialId, venda.documentoFiscal),
          venda.bandeira,
        );
      }
    }

    // Caminho 2: origem, agrupado por data da venda original.
    const faltandoPorData = new Map<
      string,
      { filialId: number; documentos: number[] }[]
    >();

    for (const dev of devolucoes) {
      const chave = this.chave(dev.filialId, Number(dev.numeroNotaOrigem));
      if (bandeiras.has(chave)) continue;

      const data = dev.dataEmissaoOrigem;
      const lista = faltandoPorData.get(data) ?? [];
      const bucket = lista.find((b) => b.filialId === dev.filialId);

      if (bucket) {
        bucket.documentos.push(Number(dev.numeroNotaOrigem));
      } else {
        lista.push({
          filialId: dev.filialId,
          documentos: [Number(dev.numeroNotaOrigem)],
        });
      }

      faltandoPorData.set(data, lista);
    }

    for (const [data, buckets] of faltandoPorData) {
      for (const bucket of buckets) {
        chamadasOrigem++;

        const parcelas = await this.trierApiClient.getParcelasCartao(
          data,
          tokenLocalTrier,
        );

        const porDocumento = new Map<number, string>();
        for (const p of parcelas) {
          if (!p.nomeCartao) continue;
          if (!porDocumento.has(p.documentoFiscal)) {
            porDocumento.set(p.documentoFiscal, p.nomeCartao);
          }
        }

        for (const documento of bucket.documentos) {
          const bandeira = porDocumento.get(documento);
          if (bandeira) {
            bandeiras.set(this.chave(bucket.filialId, documento), bandeira);
          }
        }
      }
    }

    return { bandeiras, chamadasOrigem };
  }
}
