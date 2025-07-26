import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MovementService } from './movement.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { FindAllQueryDto } from './dto/query-movement.dto';
import { Roles } from 'src/auth/role.decorator';
import { AuthGuard } from 'src/auth/auth.guard';
import { Role } from '@prisma/client';
import { Request } from 'express';

@Controller('movement')
export class MovementController {
  constructor(private readonly movementService: MovementService) {}
  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Post()
  create(@Body() createMovementDto: CreateMovementDto) {
    return this.movementService.create(createMovementDto);
  }

  @Get('list')
  findAll(@Query() query: FindAllQueryDto) {
    return this.movementService.findAll(query);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get('ant')
  findByFilialMoveAnt(@Req() req: Request) {
    const filialUser = req['sub'];
    return this.movementService.findAnt(filialUser.filialId);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get('operator')
  findByFilialOperator(@Req() req: Request) {
    const filialUser = req['sub'];
    return this.movementService.findByFilialOperator(filialUser.filialId);
  }
  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateMovementDto: UpdateMovementDto,
  ) {
    const filialUser = req['sub'];
    return this.movementService.update(
      filialUser.filialId,
      +id,
      updateMovementDto,
    );
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const filialUser = req['sub'];
    return this.movementService.remove(filialUser.filialId, +id);
  }
}
