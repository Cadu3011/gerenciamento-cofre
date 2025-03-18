import { Controller, Get, Param, Delete, Query } from '@nestjs/common';
import { AmountService } from './amount.service';

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
  @Get('ant/:id')
  findAnt(@Param('id') id: string) {
    return this.amountService.findAnt(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.amountService.findOne(+id);
  }
  @Get('last/:id')
  findLast(@Param('id') id: string) {
    return this.amountService.findLast(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.amountService.remove(+id);
  }
}
