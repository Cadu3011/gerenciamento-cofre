import { Inject, Injectable } from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class MovementService {
  @Inject()
  private readonly Prisma:PrismaService
  create(createMovementDto: CreateMovementDto) {
    return this.Prisma.movimentations.create({data:createMovementDto})
  }

  findAll() {
    return this.Prisma.movimentations.findMany()
  }

  findOne(id: number) {
    return this.Prisma.movimentations.findUnique({where:{id}})
  }

  update(id: number, updateMovementDto: UpdateMovementDto) {
    return this.Prisma.movimentations.update({where:{id},data:updateMovementDto})
  }
  remove(id:number){
    return this.Prisma.movimentations.delete({where:{id}})
  }
  
}
