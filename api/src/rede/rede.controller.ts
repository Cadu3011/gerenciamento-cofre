import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RedeService } from './rede.service';
import { CreateRedeDto } from './dto/create-rede.dto';
import { UpdateRedeDto } from './dto/update-rede.dto';

@Controller('rede')
export class RedeController {
  constructor(private readonly redeService: RedeService) {}

  @Post()
  create(@Body() createRedeDto: CreateRedeDto) {
    return this.redeService.create(createRedeDto);
  }

  @Get()
  findAll() {
    return this.redeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.redeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRedeDto: UpdateRedeDto) {
    return this.redeService.update(+id, updateRedeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.redeService.remove(+id);
  }
}
