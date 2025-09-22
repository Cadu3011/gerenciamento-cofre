import { forwardRef, Module } from '@nestjs/common';
import { AmountService } from './amount.service';
import { AmountController } from './amount.controller';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from 'src/users/users.module';
import { MovementModule } from 'src/movement/movement.module';

@Module({
  imports: [DatabaseModule, UsersModule, forwardRef(() => MovementModule)],
  controllers: [AmountController],
  providers: [AmountService],
  exports: [AmountService],
})
export class AmountModule {}
