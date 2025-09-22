import { PartialType } from '@nestjs/mapped-types';
import { CreateBalanceFisicDto } from './create-balance-fisic.dto';

export class UpdateBalanceFisicDto extends PartialType(CreateBalanceFisicDto) {}
