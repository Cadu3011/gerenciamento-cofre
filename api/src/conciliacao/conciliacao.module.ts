import { Module } from '@nestjs/common';
import { ConciliacaoService } from './conciliacao.service';
import { ConciliacaoController } from './conciliacao.controller';
import { MatchService } from './cron/match.service';
import { DatabaseModule } from 'src/database/database.module';
import { Pipeline } from './cron/pipeline';
import { FilialModule } from 'src/filial/filial.module';
import { ConciCardsCron } from './cron/execute.cron';

@Module({
  controllers: [ConciliacaoController],
  providers: [ConciliacaoService, MatchService, Pipeline, ConciCardsCron],
  imports: [DatabaseModule, FilialModule],
  exports: [ConciCardsCron],
})
export class ConciliacaoModule {}
