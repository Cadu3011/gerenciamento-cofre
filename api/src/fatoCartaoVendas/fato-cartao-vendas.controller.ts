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
import { FatoCartaoVendasService } from './fato-cartao-vendas.service';

const ADQUIRENTES = ['TRIER', 'REDE', 'CIELO'];

@Controller('fatos')
export class FatoCartaoVendasController {
  @Inject()
  private readonly fatoCartaoVendasService: FatoCartaoVendasService;

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('cartao-vendas/dashboard')
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

    return this.fatoCartaoVendasService.dashboard({
      startDate,
      endDate,
      filialId: filialId ? Number(filialId) : undefined,
      adquirente: adquirente as any,
      bandeiras: bandeirasArr,
      bandeirasModo: bandeirasModo as 'incluir' | 'excluir' | undefined,
    });
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('cartao-vendas/filtros')
  async filtros() {
    return this.fatoCartaoVendasService.getFiltros();
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR, Role.OPERADOR)
  @Get('cartao-vendas')
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

    return this.fatoCartaoVendasService.findByPeriod({
      startDate,
      endDate,
      filialId: filialId ? Number(filialId) : undefined,
      adquirente: adquirente as any,
      bandeira,
    });
  }
}