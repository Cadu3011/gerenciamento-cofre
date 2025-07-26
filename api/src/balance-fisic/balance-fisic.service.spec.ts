import { Test, TestingModule } from '@nestjs/testing';
import { BalanceFisicService } from './balance-fisic.service';

describe('BalanceFisicService', () => {
  let service: BalanceFisicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BalanceFisicService],
    }).compile();

    service = module.get<BalanceFisicService>(BalanceFisicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
