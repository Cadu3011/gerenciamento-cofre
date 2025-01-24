import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
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

 

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.amountService.remove(+id);
  }
}
