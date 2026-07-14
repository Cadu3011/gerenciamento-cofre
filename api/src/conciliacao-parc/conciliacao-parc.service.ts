import { Injectable } from '@nestjs/common';
import { CreateConciliacaoParcDto } from './dto/create-conciliacao-parc.dto';
import { UpdateConciliacaoParcDto } from './dto/update-conciliacao-parc.dto';

@Injectable()
export class ConciliacaoParcService {
  create(createConciliacaoParcDto: CreateConciliacaoParcDto) {
    return 'This action adds a new conciliacaoParc';
  }

  findAll() {
    return `This action returns all conciliacaoParc`;
  }

  findOne(id: number) {
    return `This action returns a #${id} conciliacaoParc`;
  }

  update(id: number, updateConciliacaoParcDto: UpdateConciliacaoParcDto) {
    return `This action updates a #${id} conciliacaoParc`;
  }

  remove(id: number) {
    return `This action removes a #${id} conciliacaoParc`;
  }
}
