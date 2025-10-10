import { Module } from '@nestjs/common';
import { RedeService } from './rede.service';
import { RedeController } from './rede.controller';
import { FilialModule } from 'src/filial/filial.module';

@Module({
  imports: [FilialModule],
  controllers: [RedeController],
  providers: [RedeService],
})
export class RedeModule {}
