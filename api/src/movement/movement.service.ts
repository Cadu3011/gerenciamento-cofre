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
  findByDate(date:string){
    const startOfDay = new Date(date);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(startOfDay.getDate() + 1); // Próximo dia, para capturar até o final do dia
  
    return this.Prisma.movimentations.findMany({
      where: {
        createdAt: {
          gte: startOfDay,  // Maior ou igual ao início do dia
          lt: endOfDay,     // Menor que o próximo dia (fim do dia atual)
        },
      },
    });
  }
  update(id: number, updateMovementDto: UpdateMovementDto) {
    return this.Prisma.movimentations.update({where:{id},data:updateMovementDto})
  }
  remove(id:number){
    return this.Prisma.movimentations.delete({where:{id}})
  }
  
}
