import { Test, TestingModule } from '@nestjs/testing';
import { ConciliacaoService } from './conciliacao.service';

describe('ConciliacaoService', () => {
  let service: ConciliacaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConciliacaoService],
    }).compile();

    service = module.get<ConciliacaoService>(ConciliacaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
