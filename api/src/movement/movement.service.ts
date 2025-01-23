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
  findByDate(date:string,filialId:number){
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0); // Define a data para 00:00:00 do dia

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
  const extrato = this.Prisma.movimentations.findMany({
    where: {
      createdAt: {
        gte: startOfDay,  // Maior ou igual ao início do dia
          lte: endOfDay,    // Menor que o próximo dia (fim do dia atual)
      },
      filialId:filialId
    },
  });
    return extrato
  }
  update(id: number, updateMovementDto: UpdateMovementDto) {
    return this.Prisma.movimentations.update({where:{id},data:updateMovementDto})
  }
  remove(id:number){
    return this.Prisma.movimentations.delete({where:{id}})
  }
  
}
