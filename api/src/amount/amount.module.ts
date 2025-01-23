import { Module } from '@nestjs/common';
import { AmountService } from './amount.service';
import { AmountController } from './amount.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MovementModule } from 'src/movement/movement.module';
import { MovementService } from 'src/movement/movement.service';

@Module({
  imports:[DatabaseModule,MovementModule],
  controllers: [AmountController],
  providers: [AmountService,MovementService],
  exports:[AmountService]
})
export class AmountModule {}
