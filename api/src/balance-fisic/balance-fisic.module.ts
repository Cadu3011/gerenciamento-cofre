import { Module } from '@nestjs/common';
import { BalanceFisicService } from './balance-fisic.service';
import { BalanceFisicController } from './balance-fisic.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BalanceFisicController],
  providers: [BalanceFisicService],
})
export class BalanceFisicModule {}
