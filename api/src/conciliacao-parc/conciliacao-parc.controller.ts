import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ConciliacaoParcService } from './conciliacao-parc.service';
import { CreateConciliacaoParcDto } from './dto/create-conciliacao-parc.dto';
import { UpdateConciliacaoParcDto } from './dto/update-conciliacao-parc.dto';

@Controller('conciliacao-parc')
export class ConciliacaoParcController {
  constructor(private readonly conciliacaoParcService: ConciliacaoParcService) {}

  @Post()
  create(@Body() createConciliacaoParcDto: CreateConciliacaoParcDto) {
    return this.conciliacaoParcService.create(createConciliacaoParcDto);
  }

  @Get()
  findAll() {
    return this.conciliacaoParcService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conciliacaoParcService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConciliacaoParcDto: UpdateConciliacaoParcDto) {
    return this.conciliacaoParcService.update(+id, updateConciliacaoParcDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.conciliacaoParcService.remove(+id);
  }
}
