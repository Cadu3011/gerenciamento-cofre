import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ObservacaoConciliacao,
  ParcelStatus,
  Role,
} from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/role.decorator';
import { ConciliacaoParcService } from './conciliacao-parc.service';
import { ConciliacaoParcDashboardService } from './dashboard/conciliacao-parc-dashboard.service';

@Controller('conciliacao-parc')
export class ConciliacaoParcController {
  constructor(
    private readonly service: ConciliacaoParcService,
    private readonly dashboardService: ConciliacaoParcDashboardService,
  ) {}

  private parseList(value?: string): string[] | undefined {
    if (!value) return undefined;
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  private parseStatus(value?: string): ParcelStatus[] | undefined {
    const list = this.parseList(value);
    const valid = Object.values(ParcelStatus) as string[];
    return list?.filter((v): v is ParcelStatus => valid.includes(v));
  }

  private parseDivergencias(
    value?: string,
  ): ObservacaoConciliacao[] | undefined {
    const list = this.parseList(value);
    const valid = Object.values(ObservacaoConciliacao) as string[];
    return list?.filter(
      (v): v is ObservacaoConciliacao => valid.includes(v),
    );
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post()
  async execute(@Body() body: { filialId: number; date: string }) {
    return this.service.execute(body.filialId, body.date);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get()
  async findByDate(
    @Req() req: Request,
    @Query('date') date: string,
    @Query('filialId') filialId?: string,
    @Query('status') status?: string,
    @Query('bandeiras') bandeiras?: string,
    @Query('divergencias') divergencias?: string,
  ) {
    const user = req['sub'] as any;
    if (user.roles === 'OPERADOR') {
      filialId = String(user.filialId);
    }
    return this.service.findByDate(+filialId, date, {
      status: this.parseStatus(status),
      bandeiras: this.parseList(bandeiras),
      divergencias: this.parseDivergencias(divergencias),
    });
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
    if (user.roles === 'OPERADOR') {
      filialId = String(user.filialId);
    }
    return this.service.totalsDia(+filialId, { from, to });
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('divergentes')
  async findByDateDivergentes(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('filialId') filialId?: string,
    @Query('bandeiras') bandeiras?: string,
    @Query('divergencias') divergencias?: string,
  ) {
    const user = req['sub'] as any;
    if (user.roles === 'OPERADOR') {
      filialId = String(user.filialId);
    }
    return this.service.findByDateDivergentes(+filialId, {
      from: startDate,
      to: endDate,
    }, {
      bandeiras: this.parseList(bandeiras),
      divergencias: this.parseDivergencias(divergencias),
    });
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('conciliados')
  async findByDateConciliados(
    @Req() req: Request,
    @Query('id') id: string,
    @Query('filialId') filialId?: string,
  ) {
    const user = req['sub'] as any;
    if (user.roles === 'OPERADOR') {
      filialId = String(user.filialId);
    }
    return this.service.findByDateConciliados(+filialId, +id);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Get('dashboard/parcelas')
  async dashboard(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('filialId') filialId?: string,
    @Query('bandeiras') bandeiras?: string,
  ) {
    const dateRange = { from: startDate, to: endDate };
    const fid = filialId ? +filialId : undefined;
    const bandeirasArr = bandeiras ? bandeiras.split(',') : undefined;

    const [cardsTotals, chartLines, rankings, chartRankingDivergencias, chartDiferencaMensal] = await Promise.all([
      this.dashboardService.totaisCards(dateRange, fid, bandeirasArr),
      this.dashboardService.chartLines(dateRange, fid, bandeirasArr),
      this.dashboardService.chartRankingPendencias(dateRange, bandeirasArr),
      this.dashboardService.chartRankingDivergencias(dateRange, fid, bandeirasArr),
      this.dashboardService.chartDiferencaMensal(dateRange, fid, bandeirasArr),
    ]);

    return { cardsTotals, chartLines, rankings, chartRankingDivergencias, chartDiferencaMensal };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Get('dashboard/a-receber')
  async aReceber(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('filialId') filialId?: string,
    @Query('bandeiras') bandeiras?: string,
  ) {
    const dateRange = { from: startDate, to: endDate };
    const fid = filialId ? +filialId : undefined;
    const bandeirasArr = bandeiras ? bandeiras.split(',') : undefined;
    return this.dashboardService.aReceber(dateRange, fid, bandeirasArr);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Get('dashboard/bandeiras')
  async bandeiras() {
    return this.dashboardService.getBandeiras();
  }
}
