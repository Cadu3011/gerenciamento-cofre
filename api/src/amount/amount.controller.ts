import { Controller, Get, Param, Delete } from '@nestjs/common';
import { AmountService } from './amount.service';


@Controller('amount')
export class AmountController {
  constructor(private readonly amountService: AmountService) {}

  @Get()
  findAll() {
    return this.amountService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.amountService.findOne(+id);
  }
  @Get('last/:id')
  findLast(@Param('id') id: string){
    return this.amountService.findLast(+id)
  }
 

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.amountService.remove(+id);
  }
}
