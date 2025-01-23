import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AmountService } from './amount.service';
import { CreateAmountDto } from './dto/create-amount.dto';
import { UpdateAmountDto } from './dto/update-amount.dto';

@Controller('amount')
export class AmountController {
  constructor(private readonly amountService: AmountService) {}

  @Post()
  create(@Body() createAmountDto: CreateAmountDto) {
    return this.amountService.create(createAmountDto);
  }

  @Get()
  findAll() {
    return this.amountService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.amountService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAmountDto: UpdateAmountDto) {
    return this.amountService.update(+id, updateAmountDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.amountService.remove(+id);
  }
}
