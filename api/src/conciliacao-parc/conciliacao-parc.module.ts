import { Module } from '@nestjs/common';
import { ConciliacaoParcService } from './conciliacao-parc.service';
import { ConciliacaoParcController } from './conciliacao-parc.controller';
import { DatabaseModule } from 'src/database/database.module';
import { ExtractParc } from './cron/repository/extract-parc';
import { ConciliacaoParcMatch } from './cron/conciliacao-parc.match';
import { ConciliacaoParcPipeline } from './cron/conciliacao-parc.pipeline';

@Module({
  imports: [DatabaseModule],
  controllers: [ConciliacaoParcController],
  providers: [
    ConciliacaoParcService,
    ExtractParc,
    ConciliacaoParcMatch,
    ConciliacaoParcPipeline,
  ],
})
export class ConciliacaoParcModule {}
