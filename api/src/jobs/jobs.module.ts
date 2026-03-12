import { forwardRef, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CartEtlModule } from 'src/cardETL/card-etl.module';

@Module({
  controllers: [JobsController],
  providers: [JobsService],
  imports: [DatabaseModule, forwardRef(() => CartEtlModule)],
  exports: [JobsService],
})
export class JobsModule {}
