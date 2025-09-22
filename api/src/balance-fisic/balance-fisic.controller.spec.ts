import { Test, TestingModule } from '@nestjs/testing';
import { BalanceFisicController } from './balance-fisic.controller';
import { BalanceFisicService } from './balance-fisic.service';

describe('BalanceFisicController', () => {
  let controller: BalanceFisicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BalanceFisicController],
      providers: [BalanceFisicService],
    }).compile();

    controller = module.get<BalanceFisicController>(BalanceFisicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
