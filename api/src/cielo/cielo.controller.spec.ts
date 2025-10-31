import { Test, TestingModule } from '@nestjs/testing';
import { CieloController } from './cielo.controller';
import { CieloService } from './cielo.service';

describe('CieloController', () => {
  let controller: CieloController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CieloController],
      providers: [CieloService],
    }).compile();

    controller = module.get<CieloController>(CieloController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
