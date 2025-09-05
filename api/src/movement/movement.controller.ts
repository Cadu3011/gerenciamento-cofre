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
import { MoveTrier } from './dto/create-move-trier';
import { IDCofreTrier } from './dto/filiaisTrierMock';

@Controller('movement')
export class MovementController {
  constructor(private readonly movementService: MovementService) {}
  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Post()
  async create(@Body() createMovementDto: CreateMovementDto) {
    const move = await this.movementService.create(createMovementDto);
    const idCofreTrier = IDCofreTrier(move.filialId);
    const idTrierMove: number = await MoveTrier.createDesp({
      idFilial: move.filialId,
      descricao: move.descrition,
      filialName: move.filial.name,
      idCofre: idCofreTrier,
      valor: move.value,
      idCategoria: Number(createMovementDto.idCategoria),
      date: move.createdAt,
    });
    if (idTrierMove) {
      await this.movementService.updateSync(move.id, idTrierMove);
    }
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
  async remove(@Param('id') id: string, @Req() req: Request) {
    const filialUser = req['sub'];
    const moveDel = await this.movementService.remove(filialUser.filialId, +id);
    if (moveDel.status === 'SINCRONIZADO') {
      const moveDelTrierid = await MoveTrier.deleteMoves(moveDel.idTrier);
      if (moveDelTrierid!) {
        this.movementService.insertMoveTrierDeleted(moveDelTrierid);
      }
    }
    if (moveDel.status === 'PENDENTE') {
      await MoveTrier.deleteMoves(moveDel.idTrier);
    }
    return;
  }
}
