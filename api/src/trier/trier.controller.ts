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
import { UpdateTrierCaixaDTO } from './dto/use-trier-caixa.dto';

@Controller('trier')
export class TrierController {
  constructor(private readonly trierService: TrierService) {}
  @Inject()
  private readonly prisma: PrismaService;
  @Inject()
  private readonly trierDifCaixasETL: TrierDifCxETL;

  private filterByRole(dto: any, roles: string) {
    const permissions: Record<string, string[]> = {
      OPERADOR: ['obsConf'],
      GESTOR: ['obsFinal', 'falta', 'sobra'],
    };

    const allowedFields = permissions[roles] || [];

    return Object.keys(dto)
      .filter((key) => allowedFields.includes(key))
      .reduce((acc, key) => {
        acc[key] = dto[key];
        return acc;
      }, {});
  }

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
  @Roles(Role.GESTOR)
  @Get('/admin/caixas')
  async findByDateAdmin(
    @Query('dataEmissaoInicial') dataEmissaoInicial: string,
    @Query('dataEmissaoFinal') dataEmissaoFinal: string,
    @Query('filialId') filialId: number,
  ) {
    return await this.trierService.getCaixasAdmin(
      dataEmissaoInicial,
      dataEmissaoFinal,
      +filialId,
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
      tokenLocalTrier: await authTrier(
        credentials,
        filial.urlLocalTrier,
        filial.id,
      ),
    };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR, Role.GESTOR)
  @Patch('caixas/:id')
  async caixasUpdate(
    @Param('id') id: number,
    @Body() updateTrierCaixaDTO: UpdateTrierCaixaDTO,
    @Req() req: Request,
  ) {
    const user = req['sub'] as any;
    const filteredData = this.filterByRole(updateTrierCaixaDTO, user.roles);
    const updatedCaixa = await this.trierService.updateCaixas(
      filteredData,
      +id,
    );

    return updatedCaixa;
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('dashboard/caixas')
  async getDashboard(
    @Req() req: Request,
    @Query('filialId') filialId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('operadorId') operadorId?: number,
  ) {
    const user = req['sub'];
    if (user.roles.includes('OPERADOR')) {
      filialId = user.filialId;
    }

    const { cards } = await this.trierService.cardsDifCaixa(
      startDate,
      endDate,
      +filialId,
      +operadorId,
    );
    const chartAnualDifs = await this.trierService.chartAnualDifs(
      +filialId,
      +operadorId,
    );
    const chartColunmsDifs = await this.trierService.chartColunmsDifs(
      +filialId,
      startDate,
      endDate,
    );
    const tableDifs = await this.trierService.tableDifs(
      +filialId,
      startDate,
      endDate,
      +operadorId,
    );
    return { cards, chartAnualDifs, chartColunmsDifs, tableDifs };
  }
}
