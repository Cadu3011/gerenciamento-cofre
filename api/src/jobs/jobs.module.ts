import { forwardRef, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CartEtlModule } from 'src/cardETL/card-etl.module';
import { MovementModule } from 'src/movement/movement.module';
import { CieloModule } from 'src/cielo/cielo.module';
import { TrierModule } from 'src/trier/trier.module';
import { ConciliacaoModule } from 'src/conciliacao/conciliacao.module';
import { ConciliacaoParcModule } from 'src/conciliacao-parc/conciliacao-parc.module';
import { ParcEtlModule } from 'src/parcETL/card-etl.module';
import { JobExecutionContext } from './jobs.execContext.service';
import { JobsGateway } from './jobs.gateway';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobExecutionContext, JobsGateway],
  imports: [
    DatabaseModule,
    CartEtlModule,
    MovementModule,
    CieloModule,
    TrierModule,
    ConciliacaoModule,
    ConciliacaoParcModule,
    ParcEtlModule,
  ],
  exports: [JobsService, JobExecutionContext],
})
export class JobsModule {}
