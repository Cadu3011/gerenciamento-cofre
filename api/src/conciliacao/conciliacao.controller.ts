import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { ConciliacaoService } from './conciliacao.service';
import { CreateConciliacaoDto } from './dto/create-conciliacao.dto';
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
      const sales = await this.conciliacaoService.findByDate(+filialId, date);
      const totalDif = await this.conciliacaoService.totalDiferencaDia(
        +filialId,
        date,
      );
      return { totalDif, trier: sales.trier, outros: sales.outros };
    }
    const sales = await this.conciliacaoService.findByDate(+filialId, date);

    const totalDif = await this.conciliacaoService.totalDiferencaDia(
      +filialId,
      date,
    );
    return { totalDif, trier: sales.trier, outros: sales.outros };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('totais-dia')
  async totalsDia(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('filialId') filialId?: string,
  ) {
    const user = req['sub'] as any;
    const dateRange = {
      from,
      to,
    };

    if (user.roles === 'OPERADOR') {
      filialId = user.filialId;
      return await this.conciliacaoService.totaisDias(+filialId, dateRange);
    }

    return await this.conciliacaoService.totaisDias(+filialId, dateRange);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('divergentes')
  async findByDateDivergentes(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('filialId') filialId?: string,
  ) {
    const user = req['sub'] as any;
    if (user.roles === 'OPERADOR') {
      filialId = user.filialId;
      return await this.conciliacaoService.findByDateDivergentes(+filialId, {
        from: startDate,
        to: endDate,
      });
    }
    return await this.conciliacaoService.findByDateDivergentes(+filialId, {
      from: startDate,
      to: endDate,
    });
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('conciliados')
  async findByDateConciliados(
    @Req() req: Request,
    @Query('grupoId') grupoId: string,
    @Query('filialId') filialId?: string,
  ) {
    const user = req['sub'] as any;
    if (user.roles === 'OPERADOR') {
      filialId = user.filialId;
      return await this.conciliacaoService.findByDateConciliados(
        +filialId,
        +grupoId,
      );
    }
    return await this.conciliacaoService.findByDateConciliados(
      +filialId,
      +grupoId,
    );
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

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Post('desconciliar')
  async disagreement(
    @Req() req: Request,
    @Body() data: { grupoId: number; filialId?: number },
  ) {
    const user = req['sub'] as any;
    if (user.roles === 'OPERADOR') {
      data.filialId = user.filialId;
      return await this.conciliacaoService.disagreement(
        data.grupoId,
        data.filialId,
      );
    }

    return await this.conciliacaoService.disagreement(
      data.grupoId,
      data.filialId,
    );
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Get('/dashboard/cartoes')
  async getDashboard(
    @Query('filialId') filialId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type')
    type: 'MANUAL_MENOR_2' | 'MANUAL_MAIOR_2' | 'UNICO' | 'DIVERGENTE',
  ) {
    const cardsTotals = await this.conciliacaoService.totaisCards(
      {
        from: startDate,
        to: endDate,
      },
      +filialId,
    );
    const chartLinesCards = await this.conciliacaoService.chartLinesCards(
      {
        from: startDate,
        to: endDate,
      },
      +filialId,
    );
    const chartRankingHealth = await this.conciliacaoService.chartRankingHealth(
      {
        from: startDate,
        to: endDate,
      },
      +filialId,
    );
    const rankings = await this.conciliacaoService.chartRankingPendencias({
      from: startDate,
      to: endDate,
    });
    const movesRankingByHealth =
      await this.conciliacaoService.findMovimentosByHealthType(
        {
          from: startDate,
          to: endDate,
        },
        type,
        +filialId,
      );
    return {
      cardsTotals,
      chartLinesCards,
      rankings,
      chartRankingHealth,
      movesRankingByHealth,
    };
  }
}
