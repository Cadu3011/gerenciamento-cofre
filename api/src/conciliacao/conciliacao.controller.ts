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
  Query,
  Req,
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

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get()
  async findByDate(
    @Req() req: Request,
    @Query('date') date: string,
    @Query('filialId') filialId?: string,
  ) {
    const user = req['sub'] as any;
    if (user.roles === 'OPERADOR') {
      filialId = user.filialId;
      return await this.conciliacaoService.findByDate(+filialId, date);
    }
    return await this.conciliacaoService.findByDate(+filialId, date);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('divergentes')
  async findByDateDivergentes(
    @Req() req: Request,
    @Query('date') date: string,
    @Query('filialId') filialId?: string,
  ) {
    const user = req['sub'] as any;
    if (user.roles === 'OPERADOR') {
      filialId = user.filialId;
      return await this.conciliacaoService.findByDateDivergentes(
        +filialId,
        date,
      );
    }
    return await this.conciliacaoService.findByDateDivergentes(+filialId, date);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Post('conciliar')
  async reconcile(@Req() req: Request, @Body() data: CreateConciliacaoDto) {
    const user = req['sub'] as any;
    if (user.roles === 'OPERADOR') {
      data.filialId = user.filialId;
      return await this.conciliacaoService.reconcile(data);
    }

    return await this.conciliacaoService.reconcile(data);
  }
}
