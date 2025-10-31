import { Test, TestingModule } from '@nestjs/testing';
import { TrierService } from './trier.service';

describe('TrierService', () => {
  let service: TrierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrierService],
    }).compile();

    service = module.get<TrierService>(TrierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
