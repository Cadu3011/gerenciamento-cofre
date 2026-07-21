import { Test, TestingModule } from '@nestjs/testing';
import { ConciliacaoParcService } from './conciliacao-parc.service';

describe('ConciliacaoParcService', () => {
  let service: ConciliacaoParcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConciliacaoParcService],
    }).compile();

    service = module.get<ConciliacaoParcService>(ConciliacaoParcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
