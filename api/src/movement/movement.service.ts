import { Inject, Injectable } from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { PrismaService } from 'src/database/prisma.service';
import { AmountService } from 'src/amount/amount.service';

@Injectable()
export class MovementService {
  @Inject()
  private readonly Prisma:PrismaService
  @Inject()
  private readonly Amont:AmountService

  async create(createMovementDto: CreateMovementDto) { 
    const move = await this.Prisma.movimentations.create({data:createMovementDto}); 
    await this.Amont.createOrUpdate({
      filialId: createMovementDto.filialId,
      balance: createMovementDto.value,
    });
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
