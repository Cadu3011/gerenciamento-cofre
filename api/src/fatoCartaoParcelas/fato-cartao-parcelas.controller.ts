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
import {
  FatoCartaoParcelasService,
  FatoStatus,
} from './fato-cartao-parcelas.service';

const ADQUIRENTES = ['TRIER', 'REDE', 'CIELO'];
const STATUS = ['PENDENTE', 'DIVERGENTE', 'CONCILIADO'];

/**
 * Quebra um parâmetro CSV e recusa qualquer valor fora da lista fechada.
 * Devolve `undefined` quando o parâmetro vem vazio, para o filtro ser
 * tratado como "sem restrição" (todas as origens / métrica bruta).
 */
function listaCsv(
  valor: string | undefined,
  permitidos: string[],
  campo: string,
): string[] | undefined {
  const itens = valor
    ?.split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (!itens?.length) return undefined;

  const invalido = itens.find((i) => !permitidos.includes(i));

  if (invalido) {
    throw new BadRequestException(`${campo} inválido: ${invalido}`);
  }

  return itens;
}

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
    @Query('adquirentes') adquirentes?: string,
    @Query('bandeiras') bandeiras?: string,
    @Query('bandeirasModo') bandeirasModo?: string,
    @Query('status') status?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate e endDate são obrigatórios');
    }

    const adquirentesArr = listaCsv(adquirentes, ADQUIRENTES, 'adquirente');
    const statusArr = listaCsv(status, STATUS, 'status');

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

    const [valores, conciliacao, grupos] = await Promise.all([
      this.fatoCartaoParcelasService.dashboard({
        startDate,
        endDate,
        filialId: fid,
        adquirentes: adquirentesArr as any,
        bandeiras: bandeirasArr,
        bandeirasModo: bandeirasModo as 'incluir' | 'excluir' | undefined,
        status: statusArr as FatoStatus[] | undefined,
      }),
      this.dashboardService.resumoConciliacao(
        dateRange,
        fid,
        bandeirasArr,
        adquirentesArr,
      ),
      this.dashboardService.rankingGruposPendencias(
        dateRange,
        bandeirasArr,
        adquirentesArr,
      ),
    ]);

    const grupoMap = new Map(grupos.map((g) => [g.filialId, g]));

    const rankings = valores.rankingGraos.map((r) => {
      const grupo = grupoMap.get(r.filialId);
      return {
        ...r,
        divergencias: grupo?.divergencias ?? 0,
        valorDivergencias: grupo?.valorDivergencias ?? r.valorDivergencias,
        totalGrupos: grupo?.totalGrupos ?? 0,
      };
    });

    return {
      cardsTotals: {
        ...valores.cardsTotals,
        divergencias: conciliacao.resumo.divergentes,
      },
      chartLines: valores.chartLines,
      rankings,
      chartDiferencaMensal: valores.chartDiferencaMensal,
      chartRankingDivergencias: {
        resumo: conciliacao.resumo,
        ranking: conciliacao.ranking,
      },
    };
  }

  /**
   * Só o gráfico de diferença mensal. Existe separado do endpoint principal
   * porque a página de parcelas o consome para uma janela maior que a dos
   * demais painéis — e o endpoint completo refazia aqui as agregações de
   * conciliação, que são as caras, para depois descartar o resultado.
   */
  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('cartao-parcelas/diferenca-mensal')
  async diferencaMensal(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('filialId') filialId?: string,
    @Query('adquirentes') adquirentes?: string,
    @Query('bandeiras') bandeiras?: string,
    @Query('bandeirasModo') bandeirasModo?: string,
    @Query('status') status?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate e endDate são obrigatórios');
    }

    const adquirentesArr = listaCsv(adquirentes, ADQUIRENTES, 'adquirente');
    const statusArr = listaCsv(status, STATUS, 'status');

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

    const { chartDiferencaMensal } =
      await this.fatoCartaoParcelasService.dashboard({
        startDate,
        endDate,
        filialId: filialId ? Number(filialId) : undefined,
        adquirentes: adquirentesArr as any,
        bandeiras: bandeirasArr,
        bandeirasModo: bandeirasModo as 'incluir' | 'excluir' | undefined,
        status: statusArr as FatoStatus[] | undefined,
        somenteMensal: true,
      });

    return { chartDiferencaMensal };
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
