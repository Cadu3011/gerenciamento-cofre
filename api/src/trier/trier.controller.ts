import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
  Headers,
  Query,
} from '@nestjs/common';
import { TrierService } from './trier.service';
import { authTrier } from 'src/auth/authTrier/loginTrier';
import { PrismaService } from 'src/database/prisma.service';
import { Roles } from 'src/auth/role.decorator';
import { AuthGuard } from 'src/auth/auth.guard';
import { Role } from '@prisma/client';

@Controller('trier')
export class TrierController {
  constructor(private readonly trierService: TrierService) {}
  @Inject()
  private readonly prisma: PrismaService;
  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
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
  @Roles(Role.OPERADOR)
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
}
