import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/role.decorator';
import { ReceivableGenerateService } from './receivable.generate.service';
import { ReceivableTrierService } from './receivable.trier.service';
import { PrismaService } from 'src/database/prisma.service';

@Controller('receivable')
export class ReceivableController {
  constructor(
    private readonly generateService: ReceivableGenerateService,
    private readonly trierService: ReceivableTrierService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Get()
  async findAll(
    @Query('filialId') filialId?: string,
    @Query('adquirente') adquirente?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    return this.prisma.receivable.findMany({
      where: {
        filialId: filialId ? +filialId : undefined,
        adquirente: adquirente || undefined,
        dataRecebimento: date ? new Date(`${date}T00:00:00.000Z`) : undefined,
        status: (status as any) || undefined,
      },
      include: { filial: { select: { id: true, name: true } } },
      orderBy: { dataRecebimento: 'desc' },
    });
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const recebivel = await this.prisma.receivable.findUnique({
      where: { id: +id },
      include: {
        trierParcelas: true,
        redeParcelas: true,
        cieloParcelas: true,
        filial: { select: { id: true, name: true } },
      },
    });

    if (!recebivel) return null;

    const { redeParcelas, cieloParcelas, trierParcelas, ...resto } = recebivel;
    return {
      ...resto,
      itens: [
        ...redeParcelas.map((p) => ({ origem: 'REDE', ...p })),
        ...cieloParcelas.map((p) => ({ origem: 'CIELO', ...p })),
        ...trierParcelas.map((p) => ({ origem: 'TRIER', ...p })),
      ],
    };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post('generate/:date')
  async generate(@Param('date') date: string) {
    const resultados = await this.generateService.generate(date);
    return {
      data: date,
      total: resultados.length,
      recebimentos: resultados,
    };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post(':id/send')
  async send(@Param('id') id: string) {
    return this.trierService.send(+id);
  }
}