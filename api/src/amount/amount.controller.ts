import {
  Controller,
  Get,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AmountService } from './amount.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/role.decorator';

@Controller('amount')
export class AmountController {
  constructor(private readonly amountService: AmountService) {}
  @Get()
  findAll(
    @Query() query: { dateInit: string; dateFinal: string; filialId?: number },
  ) {
    if (query.dateInit && query.dateFinal) {
      return this.amountService.findAll(
        query.dateInit,
        query.dateFinal,
        query.filialId,
      );
    }
    return {
      error: "Os parâmetros 'dateInit' e 'dateFinal' são obrigatórios.",
    };
  }
  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get('ant/:id')
  findAnt(@Param('id') id: string) {
    return this.amountService.findAnt(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.amountService.findOne(+id);
  }
  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get('last/:id')
  findLast(@Param('id') id: string) {
    return this.amountService.findLast(+id);
  }
  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.amountService.remove(+id);
  }
}
