import { Inject, Injectable } from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { PrismaService } from 'src/database/prisma.service';
import { AmountService } from 'src/amount/amount.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class MovementService {
  @Inject()
  private readonly Prisma:PrismaService
  @Inject()
  private readonly Amont:AmountService

  async create(createMovementDto: CreateMovementDto) { 

    if(createMovementDto.type =="DEPOSITO"|| createMovementDto.type == "DESPESA" && createMovementDto.value > 0){
      const saida = createMovementDto.value *-1
      await this.Prisma.movimentations.create({data:{
        ...createMovementDto, 
        value:   saida }}); 
    }else{
      await this.Prisma.movimentations.create({data:createMovementDto})
    }

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
  async remove(id:number){
    const moveDel = await this.Prisma.movimentations.delete({where:{id}})
    const valueSub = new Decimal(moveDel.value).negated().toNumber();
    await this.Amont.createOrUpdate({
      filialId: moveDel.filialId,
      balance: valueSub
    });
    return moveDel
  }
  
}
