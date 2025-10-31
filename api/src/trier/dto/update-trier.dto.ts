import { PartialType } from '@nestjs/mapped-types';
import { CreateTrierDto } from './create-trier.dto';

export class UpdateTrierDto extends PartialType(CreateTrierDto) {}
