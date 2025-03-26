import { Module } from '@nestjs/common';
import { AmountService } from './amount.service';
import { AmountController } from './amount.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MovementService } from 'src/movement/movement.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [AmountController],
  providers: [AmountService, MovementService],
  exports: [AmountService],
})
export class AmountModule {}
