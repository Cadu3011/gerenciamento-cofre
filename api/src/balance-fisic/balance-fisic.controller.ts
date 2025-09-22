import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BalanceFisicService } from './balance-fisic.service';
import { CreateBalanceFisicDto } from './dto/create-balance-fisic.dto';
import { UpdateBalanceFisicDto } from './dto/update-balance-fisic.dto';
import { Roles } from 'src/auth/role.decorator';
import { AuthGuard } from 'src/auth/auth.guard';
import { Role } from '@prisma/client';
import { Request } from 'express';

@Controller('balance-fisic')
export class BalanceFisicController {
  constructor(private readonly balanceFisicService: BalanceFisicService) {}

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Post()
  create(
    @Body() createBalanceFisicDto: CreateBalanceFisicDto,
    @Req() req: Request,
  ) {
    const filialUser = req['sub'];
    return this.balanceFisicService.create(
      createBalanceFisicDto,
      filialUser.filialId,
    );
  }
  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get()
  findByDateAt(@Req() req: Request) {
    const filialUser = req['sub'];
    return this.balanceFisicService.findByDateAt(filialUser.filialId);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Patch()
  update(
    @Body() updateBalanceFisicDto: UpdateBalanceFisicDto,
    @Req() req: Request,
  ) {
    const filialUser = req['sub'];
    return this.balanceFisicService.update(
      filialUser.filialId,
      updateBalanceFisicDto,
    );
  }
}
