import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/role.decorator';
import { ConciliacaoParcService } from './conciliacao-parc.service';

@Controller('conciliacao-parc')
export class ConciliacaoParcController {
  constructor(
    private readonly service: ConciliacaoParcService,
  ) {}

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
  ) {
    const user = req['sub'] as any;
    if (user.roles === 'OPERADOR') {
      filialId = String(user.filialId);
    }
    return this.service.findByDate(+filialId, date);
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
  ) {
    const user = req['sub'] as any;
    if (user.roles === 'OPERADOR') {
      filialId = String(user.filialId);
    }
    return this.service.findByDateDivergentes(+filialId, {
      from: startDate,
      to: endDate,
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
}
