import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CieloService } from './cielo.service';
import { CreateCieloDto } from './dto/create-cielo.dto';
import { UpdateCieloDto } from './dto/update-cielo.dto';

@Controller('cielo')
export class CieloController {
  constructor(private readonly cieloService: CieloService) {}

  @Get()
  findAll() {
    return this.cieloService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cieloService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCieloDto: UpdateCieloDto) {
    return this.cieloService.update(+id, updateCieloDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cieloService.remove(+id);
  }
}
