import { Module } from '@nestjs/common';
import { MovementService } from './movement.service';
import { MovementController } from './movement.controller';
import { DatabaseModule } from 'src/database/database.module';
import { AmountModule } from 'src/amount/amount.module';

@Module({
  imports:[DatabaseModule,AmountModule],
  controllers: [MovementController],
  providers: [MovementService],
  exports:[MovementService]
})
export class MovementModule {}
