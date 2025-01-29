import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MovementService } from './movement.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { FindAllQueryDto } from './dto/query-movement.dto';

@Controller('movement')
export class MovementController {
  constructor(private readonly movementService: MovementService) {}

  @Post()
  create(@Body() createMovementDto: CreateMovementDto) {
    return this.movementService.create(createMovementDto);
  }

  @Get('list')
  findAll(@Query() query: FindAllQueryDto) {
    return this.movementService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.movementService.findOne(+id);
  }
  @Get('operator/:filialId')
  findByFilialOperator(@Param('filialId') id:number){
    return this.movementService.findByFilialOperator(+id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMovementDto: UpdateMovementDto) {
    return this.movementService.update(+id, updateMovementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.movementService.remove(+id);
  }
}
