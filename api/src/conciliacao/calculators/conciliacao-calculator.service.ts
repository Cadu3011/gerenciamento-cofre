import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ConciliacaoCalculator {
  calculate(itens: any[]) {
    let valorTrier = new Decimal(0);
    let valorRede = new Decimal(0);
    let valorCielo = new Decimal(0);

    for (const item of itens) {
      switch (item.origem) {
        case 'TRIER':
          valorTrier = valorTrier.plus(item.valor);
          break;

        case 'REDE':
          valorRede = valorRede.plus(item.valor);
          break;

        case 'CIELO':
          valorCielo = valorCielo.plus(item.valor);
          break;
      }
    }

    return {
      valorTrier,
      valorRede,
      valorCielo,
      valorFinal: valorTrier.sub(valorRede.plus(valorCielo)),
    };
  }
}
