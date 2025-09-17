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
import { MoveTrier } from './create-move-trier.service';

@Controller('movement')
export class MovementController {
  constructor(
    private readonly movementService: MovementService,
    private readonly moveTrier: MoveTrier,
  ) {}
  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Post()
  async create(@Body() createMovementDto: CreateMovementDto) {
    const move = await this.movementService.create(createMovementDto);

    if (move.type === 'DESPESA') {
      const idTrierMove: number = await this.moveTrier.createDesp({
        idFilial: move.filialId,
        descricao: move.descrition,
        filialName: move.filial.name,
        idCofre: move.filial.idCofreTrier,
        valor: move.value,
        idCategoria: Number(createMovementDto.idCategoria),
        date: move.createdAt,
        token: createMovementDto.tokenTrier,
      });
      if (idTrierMove) {
        await this.movementService.updateSync(move.id, idTrierMove);
      }
    }
    if (move.type === 'DEPOSITO') {
      if (
        createMovementDto.idContaDest === 0 ||
        createMovementDto.idContaDest === null ||
        createMovementDto.idContaDest === undefined
      ) {
        const idTrierTransf: number = await this.moveTrier.createTransf({
          idFilial: move.filialId,
          descricao: move.descrition,
          filialName: move.filial.name,
          idCofre: move.filial.idCofreTrier,
          idCofreDestino: move.filial.idBancoDefault,
          valor: move.value.mul(-1),
          idCategoria: Number(createMovementDto.idCategoria),
          date: move.createdAt,
          token: createMovementDto.tokenTrier,
        });
        if (idTrierTransf) {
          await this.movementService.updateSync(move.id, idTrierTransf);
          await this.movementService.updateIdContaDest(
            move.id,
            move.filial.idBancoDefault,
          );
        }
      } else {
        const idTrierTransf: number = await this.moveTrier.createTransf({
          idFilial: move.filialId,
          descricao: move.descrition,
          filialName: move.filial.name,
          idCofre: move.filial.idCofreTrier,
          idCofreDestino: move.idContaDest,
          valor: move.value.mul(-1),
          idCategoria: Number(createMovementDto.idCategoria),
          date: move.createdAt,
          token: createMovementDto.tokenTrier,
        });
        if (idTrierTransf) {
          await this.movementService.updateSync(move.id, idTrierTransf);
        }
      }
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
      const moveDelTrierid: number = await this.moveTrier.deleteMoves(
        moveDel.idTrier,
        filialUser.tokenTrier,
      );
      console.log(moveDelTrierid);
      if (typeof moveDelTrierid !== 'number') {
        this.movementService.insertMoveTrierDeleted(moveDel.idTrier);
      }
    }
    if (moveDel.status === 'PENDENTE') {
      await this.moveTrier.deleteMoves(moveDel.idTrier, filialUser.tokenTrier);
    }
    return;
  }
}
