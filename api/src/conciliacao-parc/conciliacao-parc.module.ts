import { Module } from '@nestjs/common';
import { ConciliacaoParcService } from './conciliacao-parc.service';
import { ConciliacaoParcController } from './conciliacao-parc.controller';
import { DatabaseModule } from 'src/database/database.module';
import { FilialModule } from 'src/filial/filial.module';
import { ExtractParc } from './cron/repository/extract-parc';
import { ConciliacaoParcMatch } from './cron/conciliacao-parc.match';
import { ConciliacaoParcPipeline } from './cron/conciliacao-parc.pipeline';
import { ConciParcCron } from './cron/conciliacao-parc.cron';

@Module({
  imports: [DatabaseModule, FilialModule],
  controllers: [ConciliacaoParcController],
  providers: [
    ConciliacaoParcService,
    ExtractParc,
    ConciliacaoParcMatch,
    ConciliacaoParcPipeline,
    ConciParcCron,
  ],
  exports: [ConciParcCron],
})
export class ConciliacaoParcModule {}
