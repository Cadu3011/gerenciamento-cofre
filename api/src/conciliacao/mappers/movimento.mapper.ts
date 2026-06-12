import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

export interface MovimentoContext {
  item: any;
  horaFmt: string | null;
  horaNum: number;
  conciliacaoId?: number;
  data?: Date;
  motivo?: string;
  valorFinal?: Decimal;
}

@Injectable()
export class MovimentoMapper {
  toTrier(ctx: MovimentoContext) {
    const { item, horaFmt, horaNum } = ctx;

    return {
      id: item.id,
      grupoId: item.grupoId,
      conciliacaoId: ctx.conciliacaoId,
      horaNum,
      hora: horaFmt,
      valor: item.valor,
      documentoFiscal: item.trier?.documentoFiscal,
      modalidade: item.trier?.modalidade,
      bandeira: item.trier?.bandeira,
      status: item.trier?.statusConciliacao,
      origem: item.origem,
      data: ctx.data,
      motivo: ctx.motivo,
      valorFinal: ctx.valorFinal,
    };
  }

  toRede(ctx: MovimentoContext) {
    const { item, horaFmt, horaNum } = ctx;

    return {
      id: item.id,
      grupoId: item.grupoId,
      conciliacaoId: ctx.conciliacaoId,
      horaNum,
      hora: horaFmt,
      valor: item.valor,
      nsu: item.rede?.nsu,
      modalidade: item.rede?.modalidade,
      bandeira: item.rede?.bandeira,
      status: item.rede?.statusConciliacao,
      origem: item.origem,
      data: ctx.data,
      motivo: ctx.motivo,
      valorFinal: ctx.valorFinal,
    };
  }

  toCielo(ctx: MovimentoContext) {
    const { item, horaFmt, horaNum } = ctx;

    return {
      id: item.id,
      grupoId: item.grupoId,
      conciliacaoId: ctx.conciliacaoId,
      horaNum,
      hora: horaFmt,
      valor: item.valor,
      nsu: item.cielo?.nsu,
      modalidade: item.cielo?.modalidade,
      bandeira: item.cielo?.bandeira,
      status: item.cielo?.statusConciliacao,
      origem: item.origem,
      data: ctx.data,
      motivo: ctx.motivo,
      valorFinal: ctx.valorFinal,
    };
  }
}
