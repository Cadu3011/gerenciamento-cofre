import { PartialType } from '@nestjs/mapped-types';
import { CreateCieloDto } from './create-cielo.dto';

export class UpdateCieloDto extends PartialType(CreateCieloDto) {}
