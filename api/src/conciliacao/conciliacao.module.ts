import { Module } from '@nestjs/common';
import { ConciliacaoService } from './conciliacao.service';
import { ConciliacaoController } from './conciliacao.controller';
import { MatchService } from './cron/match.service';
import { DatabaseModule } from 'src/database/database.module';
import { Pipeline } from './cron/pipeline';

@Module({
  controllers: [ConciliacaoController],
  providers: [ConciliacaoService, MatchService, Pipeline],
  imports: [DatabaseModule],
})
export class ConciliacaoModule {}
