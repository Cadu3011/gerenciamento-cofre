import { PartialType } from '@nestjs/mapped-types';
import { CreateConciliacaoParcDto } from './create-conciliacao-parc.dto';

export class UpdateConciliacaoParcDto extends PartialType(CreateConciliacaoParcDto) {}
