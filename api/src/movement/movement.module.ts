import { forwardRef, Module } from '@nestjs/common';
import { MovementService } from './movement.service';
import { MovementController } from './movement.controller';
import { DatabaseModule } from 'src/database/database.module';
import { AmountModule } from 'src/amount/amount.module';
import { MoveTrier } from './create-move-trier.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => AmountModule), AuthModule],
  controllers: [MovementController],
  providers: [MovementService, MoveTrier],
  exports: [MovementService, MoveTrier],
})
export class MovementModule {}
