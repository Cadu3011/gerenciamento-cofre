import { Injectable } from '@nestjs/common';
import { ConciliacaoGrupo } from '@prisma/client';

export enum HealthType {
  AUTOMATICO,
  MANUAL_MENOR_2,
  MANUAL_MAIOR_2,
  UNICO,
  DIVERGENTE,
}

@Injectable()
export class ConciliacaoHealthService {
  classify(grupo: any): HealthType {
    const itensConciliaveis = grupo.itens.filter(
      (item) =>
        item.origem === 'TRIER' ||
        item.origem === 'REDE' ||
        item.origem === 'CIELO',
    );

    const qtdTrier = itensConciliaveis.filter(
      (x) => x.origem === 'TRIER',
    ).length;

    const qtdAdquirente = itensConciliaveis.filter(
      (x) => x.origem === 'REDE' || x.origem === 'CIELO',
    ).length;

    const ehUnico =
      qtdTrier !== qtdAdquirente && itensConciliaveis.length === 1;

    if (ehUnico) {
      return HealthType.UNICO;
    }

    if (grupo.metodo === 'AUTO') {
      return HealthType.AUTOMATICO;
    }

    const diferenca = Number(grupo.valorFinal ?? 0);

    if (diferenca >= -2 && diferenca <= 2) {
      return HealthType.MANUAL_MENOR_2;
    }

    return HealthType.MANUAL_MAIOR_2;
  }
}
