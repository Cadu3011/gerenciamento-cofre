import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/database/prisma.service';
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
  @Inject()
  private readonly Prisma: PrismaService

  async create(createUserDto: CreateUserDto) {
    const hash = await bcrypt.hash(createUserDto.password,10)
    const {...userData } = createUserDto;
    return this.Prisma.user.create({data:{...userData,password:hash}});
  }

  findAll() {
    return this.Prisma.user.findMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async update(params:{id: number, updateUserDto: UpdateUserDto}) {
    if (params.updateUserDto.password) {
      params.updateUserDto.password = await bcrypt.hash(params.updateUserDto.password.toString(), 10);
   }
   const{id, updateUserDto} = params
    return this.Prisma.user.update({where: { id },  // Identifica o usuário a ser atualizado
      data: updateUserDto,});
  }
}
