import { Injectable } from '@nestjs/common';
import { CreateRedeDto } from './dto/create-rede.dto';
import { UpdateRedeDto } from './dto/update-rede.dto';

@Injectable()
export class RedeService {
  create(createRedeDto: CreateRedeDto) {
    return 'This action adds a new rede';
  }

  findAll() {
    return `This action returns all rede`;
  }

  findOne(id: number) {
    return `This action returns a #${id} rede`;
  }

  update(id: number, updateRedeDto: UpdateRedeDto) {
    return `This action updates a #${id} rede`;
  }

  remove(id: number) {
    return `This action removes a #${id} rede`;
  }
}
