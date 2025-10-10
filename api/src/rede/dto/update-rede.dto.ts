import { PartialType } from '@nestjs/mapped-types';
import { CreateRedeDto } from './create-rede.dto';

export class UpdateRedeDto extends PartialType(CreateRedeDto) {}
