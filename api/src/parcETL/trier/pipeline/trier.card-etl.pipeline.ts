import { Inject } from '@nestjs/common';

import { TrierAuth } from '../contracts/trier.extract.strategy';
import { TrierPipelineStrategy } from '../contracts/trier.pipeline.strategy';
import { TrierParcExtractor } from '../extract/trier.cardExtractor';
import { TrierParcLoad } from '../load/trier.cardLoad';
import { TrierParcTransform } from '../transform/trier.cardTransform';
import { TrierApiClient } from '../infra/http/trier-api.client';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

export class TrierParcETLPipeline implements TrierPipelineStrategy {
  @Inject()
  private readonly extractor: TrierParcExtractor;

  @Inject()
  private readonly transform: TrierParcTransform;

  @Inject()
  private readonly loader: TrierParcLoad;

  @Inject()
  private readonly trierApiClient: TrierApiClient;

  key = 'Parc_ETL';
  async execute(ctx: TrierAuth, context: JobExecutionContext) {
    let currentStep = '';
    try {
      currentStep = 'EXTRACT';
      context.startStep(currentStep);
      const rawDataBruto = await this.extractor.execute(ctx);
      const rawData = rawDataBruto.filter((x) => x.codigoCartao !== 34);

      const estornos = await this.trierApiClient.getEstornos(
        ctx.date,
        ctx.tokenLocalTrier,
        ctx.urlLocalTrier,
      );

      const filialId = rawData.length > 0 ? rawData[0].filialId : null;

      const estornoParcelsBruto = estornos.estornos
        .filter((est) => filialId === null || estornos.codigoLoja === filialId)
        .map((est) => ({
          filialId: estornos.codigoLoja,
          codigoCartao: 0,
          documentoFiscal: Number(est.numeroNotaDevolucao),
          idTransacao: `VE:${est.numeroNotaDevolucao}`,
          prazoVenda: '',
          valorParcela: -Number(est.totalNotaDevolucao),
          modalidadeVenda: null as string | null,
          nomeCartao: null as string | null,
          dataVencimento: est.dataEmissaoDevolucao,
          dataPagamento: null as string | null,
          nsuAdministradora: '',
          dataEmissao: est.dataEmissaoDevolucao,
          administradoraCartao: '',
          totalParcelas: 1,
          numeroParcela: 1,
          valorTaxas: 0,
        }));
      const estornoParcels = estornoParcelsBruto.filter((x) =>
        rawData.some((y) => y.documentoFiscal === x.documentoFiscal),
      );
      const rawDataComEstorno = [...rawData, ...estornoParcels];

      context.incrementExtracted(rawDataComEstorno.length);
      await context.endStep(
        currentStep,
        `${rawDataComEstorno.length} Registros extraidos (${rawData.length} parcelas, ${estornoParcels.length} estornos)`,
      );
      currentStep = 'TRANSFORM';
      context.startStep(currentStep);
      const trasformed = await this.transform.execute(rawDataComEstorno);
      await context.endStep(
        currentStep,
        `${trasformed.length} Registros transformados`,
      );
      currentStep = 'LOAD';
      context.startStep(currentStep);
      const inserteds = await this.loader.execute(trasformed);
      context.incrementInserted(inserteds);
      await context.endStep(currentStep, `${inserteds} Linhas Inseridas`);
    } catch (error) {
      context.error(currentStep, error.message);

      throw error;
    } finally {
    }
    context.info('PIPELINE', 'Pipeline Encerrada');
  }
}
