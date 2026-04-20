import { forwardRef, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CartEtlModule } from 'src/cardETL/card-etl.module';
import { MovementModule } from 'src/movement/movement.module';
import { CieloModule } from 'src/cielo/cielo.module';
import { TrierModule } from 'src/trier/trier.module';
import { ConciliacaoModule } from 'src/conciliacao/conciliacao.module';

@Module({
  controllers: [JobsController],
  providers: [JobsService],
  imports: [
    DatabaseModule,
    CartEtlModule,
    MovementModule,
    CieloModule,
    TrierModule,
    ConciliacaoModule,
  ],
  exports: [JobsService],
})
export class JobsModule {}
