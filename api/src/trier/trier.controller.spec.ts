import { Test, TestingModule } from '@nestjs/testing';
import { TrierController } from './trier.controller';
import { TrierService } from './trier.service';

describe('TrierController', () => {
  let controller: TrierController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrierController],
      providers: [TrierService],
    }).compile();

    controller = module.get<TrierController>(TrierController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
