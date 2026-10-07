import { Inject, Injectable } from '@nestjs/common';

import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';
import { TrierApiClient } from '../../infra/http/trier-api.client';
import { TrierAuth } from '../../contracts/trier.extract.strategy';
import { DevolucaoExtracted } from '../contracts/trier.devolucao.types';
import { TrierDevolucaoTransform } from '../transform/trier.devolucaoTransform';
import { TrierDevolucaoLoad } from '../load/trier.devolucaoLoad';

/**
 * ETL de devoluções do Trier.
 *
 * Roda em cadeia depois do ETL de parcelas, para o dia, dentro da mesma
 * iteração do cron — mas é uma pipeline própria, registrada no módulo como
 * provider e chamada pelo `TrierParcETLPipeline` no fim do LOAD das parcelas.
 * Assim herda de graça o login por filial, o `period` (DATE/RANGE/AUTO), o
 * `bigCharge` e o controle de "periodo muito grande" do `TrierParcCron`, sem
 * duplicar nenhuma dessas regras nem criar um cron só dela.
 *
 * O que muda em relação ao ETL antigo: a devolução deixa de ser uma linha de
 * parcela anônima sem bandeira e passa a carregar a bandeira da venda que
 * ela cancelou, mais a nota dessa venda em `documentoFiscalEstorno`.
 */
@Injectable()
export class TrierDevolucaoPipeline {
  @Inject()
  private readonly trierApiClient: TrierApiClient;

  @Inject()
  private readonly transform: TrierDevolucaoTransform;

  @Inject()
  private readonly load: TrierDevolucaoLoad;

  key = 'TrierDevolucao_ETL';

  async execute(ctx: TrierAuth, context: JobExecutionContext) {
    let currentStep = '';

    try {
      currentStep = 'EXTRACT';
      context.startStep(currentStep);

      const resposta = await this.trierApiClient.getEstornos(
        ctx.date,
        ctx.tokenLocalTrier,
      );

      // A rota devolve os estornos da loja do request e sinaliza a loja em
      // `codigoLoja`. Quando o cron roda filial a filial, só os estornos da
      // filial em foco podem ser aceitos.
      const filialId = Number(resposta.codigoLoja);
      const estornos = (resposta.estornos ?? []).filter(
        (est) => Number(est.numeroNotaDevolucao) > 0,
      );

      context.incrementExtracted(estornos.length);
      await context.endStep(
        currentStep,
        `${estornos.length} devoluções extraídas para ${ctx.date} (filial ${filialId})`,
      );

      if (!estornos.length) {
        return { inseridas: 0, atualizadas: 0, naoResolvidas: 0 };
      }

      const devolucoes: DevolucaoExtracted[] = estornos.map((est) => ({
        filialId,
        numeroNotaDevolucao: Number(est.numeroNotaDevolucao),
        dataEmissaoDevolucao: est.dataEmissaoDevolucao,
        totalNotaDevolucao: Number(est.totalNotaDevolucao),
        numeroNotaOrigem: Number(est.numeroNotaOrigem),
        dataEmissaoOrigem: est.dataEmissaoOrigem,
        totalNotaOrigem: Number(est.totalNotaOrigem),
      }));

      currentStep = 'TRANSFORM';
      context.startStep(currentStep);

      const transformadas = await this.transform.execute(
        devolucoes,
        ctx.tokenLocalTrier,
      );

      await context.endStep(
        currentStep,
        `${transformadas.linhas.length} devoluções transformadas, bandeira da venda original para ${
          transformadas.linhas.length - transformadas.naoResolvidas.length
        } (${transformadas.chamadasOrigem} chamadas à origem)`,
      );

      if (transformadas.naoResolvidas.length) {
        const valorSemMarca = transformadas.naoResolvidas.reduce(
          (soma, n) => soma + n.valor,
          0,
        );

        // Não é mais pendência: sem venda original a devolução entra como
        // PIX SEGURO - PAGGPIX, que é a regra do ETL de cartões para o
        // codigoCartao 34. Fica em `info` porque o bucket vazio do dashboard
        // não era para acumular devolução.
        await context.info(
          currentStep,
          `${transformadas.naoResolvidas.length} devoluções sem venda original, classificadas como PIX SEGURO - PAGGPIX: ` +
            `valor ${valorSemMarca.toFixed(2)}. ` +
            `Amostra: ${transformadas.naoResolvidas
              .slice(0, 5)
              .map(
                (n) =>
                  `dev ${n.documentoDevolucao} -> venda ${n.numeroNotaOrigem} (${n.dataEmissaoOrigem})`,
              )
              .join(', ')}`,
        );
      }

      currentStep = 'LOAD';
      context.startStep(currentStep);

      const gravadas = await this.load.execute(transformadas.linhas);

      context.incrementInserted(gravadas.inseridas);
      await context.endStep(
        currentStep,
        `${gravadas.inseridas} devoluções inseridas, ${gravadas.atualizadas} atualizadas`,
      );

      return {
        ...gravadas,
        naoResolvidas: transformadas.naoResolvidas.length,
      };
    } catch (error) {
      context.error(currentStep, error.message);
      throw error;
    }
  }
}
