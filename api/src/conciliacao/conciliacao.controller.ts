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
import { ConciliacaoDashboardService } from './dashboard/conciliacao-dashboard.service';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

@Controller('conciliacao')
export class ConciliacaoController {
  @Inject()
  private readonly conciliacaoService: ConciliacaoService;

  @Inject()
  private readonly pipelineConciCards: Pipeline;

  @Inject()
  private readonly conciliacaoDashboardService: ConciliacaoDashboardService;

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post()
  async execute(@Body() body: { filialId: number; date: string }) {
    const context = new JobExecutionContext();
    await this.pipelineConciCards.execute(body.filialId, body.date, context);
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
      return await this.conciliacaoDashboardService.totaisDias(
        +filialId,
        dateRange,
      );
    }

    return await this.conciliacaoDashboardService.totaisDias(
      +filialId,
      dateRange,
    );
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
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('/dashboard/cartoes')
  async getDashboard(
    @Req() req: Request,

    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type')
    type: 'MANUAL_MENOR_2' | 'MANUAL_MAIOR_2' | 'UNICO' | 'DIVERGENTE',
    @Query('filialId') filialId?: number,
  ) {
    const user = req['sub'];
    if (user.roles.includes('OPERADOR')) {
      filialId = user.filialId;
    }
    const cardsTotals = await this.conciliacaoDashboardService.totaisCards(
      {
        from: startDate,
        to: endDate,
      },
      +filialId,
    );
    const chartLinesCards =
      await this.conciliacaoDashboardService.chartLinesCards(
        {
          from: startDate,
          to: endDate,
        },
        +filialId,
      );
    const chartRankingHealth =
      await this.conciliacaoDashboardService.chartRankingHealth(
        {
          from: startDate,
          to: endDate,
        },
        +filialId,
      );
    const rankings =
      await this.conciliacaoDashboardService.chartRankingPendencias({
        from: startDate,
        to: endDate,
      });
    const movesRankingByHealth =
      await this.conciliacaoDashboardService.findMovimentosByHealthType(
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
