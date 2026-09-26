import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/role.decorator';
import { ConciliacaoParcDashboardService } from 'src/conciliacao-parc/dashboard/conciliacao-parc-dashboard.service';
import { FatoCartaoParcelasService } from './fato-cartao-parcelas.service';

const ADQUIRENTES = ['TRIER', 'REDE', 'CIELO'];

@Controller('fatos')
export class FatoCartaoParcelasController {
  @Inject()
  private readonly fatoCartaoParcelasService: FatoCartaoParcelasService;

  @Inject()
  private readonly dashboardService: ConciliacaoParcDashboardService;

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('cartao-parcelas/dashboard')
  async dashboard(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('filialId') filialId?: string,
    @Query('adquirente') adquirente?: string,
    @Query('bandeiras') bandeiras?: string,
    @Query('bandeirasModo') bandeirasModo?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate e endDate são obrigatórios');
    }

    if (adquirente && !ADQUIRENTES.includes(adquirente)) {
      throw new BadRequestException('adquirente inválido');
    }

    if (bandeirasModo && !['incluir', 'excluir'].includes(bandeirasModo)) {
      throw new BadRequestException('bandeirasModo inválido');
    }

    const user = req['sub'] as any;
    if (user?.roles?.includes('OPERADOR')) {
      filialId = String(user.filialId);
    }

    const bandeirasArr = bandeiras
      ?.split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    const dateRange = { from: startDate, to: endDate };
    const fid = filialId ? Number(filialId) : undefined;

    const [valores, chartRankingDivergencias, aging, grupos] =
      await Promise.all([
        this.fatoCartaoParcelasService.dashboard({
          startDate,
          endDate,
          filialId: fid,
          adquirente: adquirente as any,
          bandeiras: bandeirasArr,
          bandeirasModo: bandeirasModo as 'incluir' | 'excluir' | undefined,
        }),
        this.dashboardService.chartRankingDivergencias(
          dateRange,
          fid,
          bandeirasArr,
        ),
        this.dashboardService.agingPendencias(dateRange, fid, bandeirasArr),
        this.dashboardService.rankingGruposPendencias(dateRange, bandeirasArr),
      ]);

    const grupoMap = new Map(grupos.map((g) => [g.filialId, g]));

    const rankings = valores.rankingGraos.map((r) => {
      const grupo = grupoMap.get(r.filialId);
      const totalGrupos = grupo?.totalGrupos ?? 0;
      const automaticos = grupo?.automaticos ?? 0;
      return {
        ...r,
        divergencias: grupo?.divergencias ?? 0,
        valorDivergencias: grupo?.valorDivergencias ?? r.valorDivergencias,
        totalGrupos,
        automaticos,
        taxaAutomatica:
          totalGrupos > 0
            ? Number(((automaticos / totalGrupos) * 100).toFixed(2))
            : 0,
      };
    });

    return {
      cardsTotals: {
        ...valores.cardsTotals,
        divergencias: chartRankingDivergencias.resumo.divergentes,
      },
      chartLines: valores.chartLines,
      rankings,
      chartDiferencaMensal: valores.chartDiferencaMensal,
      chartRankingDivergencias,
      aging,
    };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('cartao-parcelas/filtros')
  async filtros() {
    return this.fatoCartaoParcelasService.getFiltros();
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('cartao-parcelas')
  async findByPeriod(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('filialId') filialId?: string,
    @Query('adquirente') adquirente?: string,
    @Query('bandeira') bandeira?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate e endDate são obrigatórios');
    }

    if (adquirente && !ADQUIRENTES.includes(adquirente)) {
      throw new BadRequestException('adquirente inválido');
    }

    const user = req['sub'] as any;
    if (user?.roles?.includes('OPERADOR')) {
      filialId = String(user.filialId);
    }

    return this.fatoCartaoParcelasService.findByPeriod({
      startDate,
      endDate,
      filialId: filialId ? Number(filialId) : undefined,
      adquirente: adquirente as any,
      bandeira,
    });
  }
}