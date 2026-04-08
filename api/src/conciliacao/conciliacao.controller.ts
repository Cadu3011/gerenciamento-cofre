import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ConciliacaoService } from './conciliacao.service';
import { CreateConciliacaoDto } from './dto/create-conciliacao.dto';
import { UpdateConciliacaoDto } from './dto/update-conciliacao.dto';

@Controller('conciliacao')
export class ConciliacaoController {
  constructor(private readonly conciliacaoService: ConciliacaoService) {}

  @Post()
  create(@Body() createConciliacaoDto: CreateConciliacaoDto) {
    return this.conciliacaoService.create(createConciliacaoDto);
  }

  @Get()
  findAll() {
    return this.conciliacaoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conciliacaoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConciliacaoDto: UpdateConciliacaoDto) {
    return this.conciliacaoService.update(+id, updateConciliacaoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.conciliacaoService.remove(+id);
  }
}
