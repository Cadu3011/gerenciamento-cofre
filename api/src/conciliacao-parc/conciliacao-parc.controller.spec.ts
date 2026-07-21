import { Test, TestingModule } from '@nestjs/testing';
import { ConciliacaoParcController } from './conciliacao-parc.controller';
import { ConciliacaoParcService } from './conciliacao-parc.service';

describe('ConciliacaoParcController', () => {
  let controller: ConciliacaoParcController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConciliacaoParcController],
      providers: [ConciliacaoParcService],
    }).compile();

    controller = module.get<ConciliacaoParcController>(ConciliacaoParcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
