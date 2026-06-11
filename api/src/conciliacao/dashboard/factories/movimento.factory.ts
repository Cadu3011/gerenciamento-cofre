import { Injectable } from '@nestjs/common';
import {
  MovimentoContext,
  MovimentoMapper,
} from 'src/conciliacao/mappers/movimento.mapper';

@Injectable()
export class MovimentoFactory {
  constructor(private readonly mapper: MovimentoMapper) {}

  build(ctx: MovimentoContext) {
    switch (ctx.item.origem) {
      case 'TRIER':
        return this.mapper.toTrier(ctx);

      case 'REDE':
        return this.mapper.toRede(ctx);

      case 'CIELO':
        return this.mapper.toCielo(ctx);

      default:
        return null;
    }
  }
}
