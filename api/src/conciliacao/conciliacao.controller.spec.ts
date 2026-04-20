import { Test, TestingModule } from '@nestjs/testing';
import { ConciliacaoController } from './conciliacao.controller';
import { ConciliacaoService } from './conciliacao.service';

describe('ConciliacaoController', () => {
  let controller: ConciliacaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConciliacaoController],
      providers: [ConciliacaoService],
    }).compile();

    controller = module.get<ConciliacaoController>(ConciliacaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
