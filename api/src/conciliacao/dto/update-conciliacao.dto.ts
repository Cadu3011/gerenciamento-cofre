import { PartialType } from '@nestjs/mapped-types';
import { CreateConciliacaoDto } from './create-conciliacao.dto';

export class UpdateConciliacaoDto extends PartialType(CreateConciliacaoDto) {}
