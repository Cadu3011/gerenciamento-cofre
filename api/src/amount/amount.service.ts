import { Inject, Injectable } from '@nestjs/common';
import { CreateAmountDto } from './dto/create-amount.dto';
import { UpdateAmountDto } from './dto/update-amount.dto';
import { PrismaService } from 'src/database/prisma.service';
import { MovementService } from 'src/movement/movement.service';

@Injectable()
export class AmountService {
  @Inject()
  private readonly Prisma:PrismaService
  @Inject()
  private readonly transactions: MovementService

  async create(createAmountDto: CreateAmountDto) {
    const date:Date= new Date() 
    const dateFormat:string = date.toISOString()
    const movements = await this.transactions.findByDate(dateFormat,createAmountDto.filialId)
    if(movements.length>0){
      this.Prisma.dailyBalance.create({data:createAmountDto})
    }
    return movements.length
    
  }

  findAll() {
    return this.Prisma.dailyBalance.findMany()
  }

  findOne(id: number) {
    return `This action returns a #${id} amount`;
  }

  update(id: number, updateAmountDto: UpdateAmountDto) {
    return `This action updates a #${id} amount`;
  }

  remove(id: number) {
    return `This action removes a #${id} amount`;
  }
}
