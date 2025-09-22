import {
  Controller,
  Get,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AmountService } from './amount.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/role.decorator';
import { Request } from 'express';

@Controller('amount')
export class AmountController {
  constructor(private readonly amountService: AmountService) {}
  @UseGuards(AuthGuard)
  @Get()
  findAll(
    @Query() query: { dateInit: string; dateFinal: string; filialId?: number },
  ) {
    if (query.dateInit && query.dateFinal) {
      return this.amountService.findAll(
        query.dateInit,
        query.dateFinal,
        query.filialId,
      );
    }
    return {
      error: "Os parâmetros 'dateInit' e 'dateFinal' são obrigatórios.",
    };
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get('ant')
  findAnt(@Req() req: Request) {
    const filialUser = req['sub'];
    return this.amountService.findAnt(filialUser.filialId);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get('last')
  findLast(@Req() req: Request) {
    const filialUser = req['sub'];
    return this.amountService.findLast(filialUser.filialId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.amountService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.amountService.remove(+id);
  }
}
