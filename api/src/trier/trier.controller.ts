import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
  Headers,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import { TrierService } from './trier.service';
import { authTrier } from 'src/auth/authTrier/loginTrier';
import { PrismaService } from 'src/database/prisma.service';
import { Roles } from 'src/auth/role.decorator';
import { AuthGuard } from 'src/auth/auth.guard';
import { Role } from '@prisma/client';
import { TrierDifCxETL } from './trierDIfCx.service';

@Controller('trier')
export class TrierController {
  constructor(private readonly trierService: TrierService) {}
  @Inject()
  private readonly prisma: PrismaService;
  @Inject()
  private readonly trierDifCaixasETL: TrierDifCxETL;

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get('/caixas')
  async findByDate(
    @Req() req: Request,
    @Query('dataEmissaoInicial') dataEmissaoInicial: string,
    @Query('dataEmissaoFinal') dataEmissaoFinal: string,
  ) {
    const filialUser = req['sub'];

    return await this.trierService.getCaixas(
      dataEmissaoInicial,
      dataEmissaoFinal,
      filialUser.filialId,
    );
  }
  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR, Role.GESTOR)
  @Get()
  async findAll(
    @Req() req: Request,
    @Headers('authTrierLocal') authHeader: string,
    @Query('dataEmissaoInicial') dataEmissaoInicial: string,
    @Query('dataEmissaoFinal') dataEmissaoFinal: string,
  ) {
    const filialUser = req['sub'];
    const filial = await this.prisma.filial.findUnique({
      where: { id: filialUser.filialId },
    });
    const tokenLocalTrier = authHeader?.replace(/^Bearer\s+/i, '');

    return this.trierService.findSalesTotals(
      filial.urlLocalTrier,
      tokenLocalTrier,
      dataEmissaoInicial,
      dataEmissaoFinal,
    );
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get('/details')
  async findDetails(
    @Req() req: Request,
    @Headers('authTrierLocal') authHeader: string,
    @Query('date') date: string,
  ) {
    const filialUser = req['sub'];
    const filial = await this.prisma.filial.findUnique({
      where: { id: filialUser.filialId },
    });
    const tokenLocalTrier = authHeader?.replace(/^Bearer\s+/i, '');
    return this.trierService.findSalesDetails(
      filial.urlLocalTrier,
      tokenLocalTrier,
      date,
    );
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR, Role.GESTOR)
  @Post()
  async authTrier(
    @Req() req: Request,
    @Body() credentials: { login: string; password: string },
  ) {
    const filialUser = req['sub'];
    const filial = await this.prisma.filial.findUnique({
      where: { id: filialUser.filialId },
    });

    return {
      tokenLocalTrier: await authTrier(credentials, filial.urlLocalTrier),
    };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Patch('caixas/:id')
  async caixasObsConf(@Param('id') id: number, @Body('obs') obs: string) {
    return await this.trierService.caixasObsConf(obs, +id);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Get('dashboard/caixas')
  async getCardsDashboard(
    @Query('filialId') filialId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('operadorId') operadorId?: number,
  ) {
    const { cards } = await this.trierService.cardsDifCaixa(
      startDate,
      endDate,
      filialId,
      operadorId,
    );
    const chartAnualDifs = await this.trierService.chartAnualDifs(
      filialId,
      operadorId,
    );
    return { cards, chartAnualDifs };
  }
}
