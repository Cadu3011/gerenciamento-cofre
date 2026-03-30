import { PartialType } from '@nestjs/mapped-types';
import { Decimal } from '@prisma/client/runtime/library';

export class CreateTrierCaixaDTO {
  obsConf: string;
  obsFinal: string;
  falta: Decimal;
  sobra: Decimal;
}

export class UpdateTrierCaixaDTO extends PartialType(CreateTrierCaixaDTO) {}
