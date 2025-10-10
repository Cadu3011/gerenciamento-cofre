import { Test, TestingModule } from '@nestjs/testing';
import { RedeController } from './rede.controller';
import { RedeService } from './rede.service';

describe('RedeController', () => {
  let controller: RedeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedeController],
      providers: [RedeService],
    }).compile();

    controller = module.get<RedeController>(RedeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
