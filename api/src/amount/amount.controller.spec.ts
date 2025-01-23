import { Test, TestingModule } from '@nestjs/testing';
import { AmountController } from './amount.controller';
import { AmountService } from './amount.service';

describe('AmountController', () => {
  let controller: AmountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AmountController],
      providers: [AmountService],
    }).compile();

    controller = module.get<AmountController>(AmountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
