import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ConciliacaoService } from './conciliacao.service';
import { CreateConciliacaoDto } from './dto/create-conciliacao.dto';
import { UpdateConciliacaoDto } from './dto/update-conciliacao.dto';
import { Pipeline } from './cron/pipeline';
import { AuthGuard } from 'src/auth/auth.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/role.decorator';

@Controller('conciliacao')
export class ConciliacaoController {
  constructor(private readonly conciliacaoService: ConciliacaoService) {}

  @Inject()
  private readonly pipelineConciCards: Pipeline;

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post()
  async execute(@Body() body: { filialId: number; date: string }) {
    await this.pipelineConciCards.execute(body.filialId, body.date);
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
  update(
    @Param('id') id: string,
    @Body() updateConciliacaoDto: UpdateConciliacaoDto,
  ) {
    return this.conciliacaoService.update(+id, updateConciliacaoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.conciliacaoService.remove(+id);
  }
}
