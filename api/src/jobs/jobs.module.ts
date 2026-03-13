import { forwardRef, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CartEtlModule } from 'src/cardETL/card-etl.module';
import { MovementModule } from 'src/movement/movement.module';
import { CieloModule } from 'src/cielo/cielo.module';

@Module({
  controllers: [JobsController],
  providers: [JobsService],
  imports: [DatabaseModule, CartEtlModule, MovementModule, CieloModule],
  exports: [JobsService],
})
export class JobsModule {}
