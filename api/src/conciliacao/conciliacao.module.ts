import { Module } from '@nestjs/common';
import { ConciliacaoService } from './conciliacao.service';
import { ConciliacaoController } from './conciliacao.controller';
import { MatchService } from './cron/match.service';
import { DatabaseModule } from 'src/database/database.module';
import { Pipeline } from './cron/pipeline';
import { FilialModule } from 'src/filial/filial.module';
import { ConciCardsCron } from './cron/execute.cron';
import { ConciliacaoTimeHelper } from './helpers/conciliacao-time.service';
import { ConciliacaoDashboardService } from './dashboard/conciliacao-dashboard.service';
import { ConciliacaoStatusService } from './conciliacao-status.service';
import { MovimentoMapper } from './mappers/movimento.mapper';
import { MovimentoFactory } from './dashboard/factories/movimento.factory';

@Module({
  controllers: [ConciliacaoController],
  providers: [
    ConciliacaoService,
    MatchService,
    Pipeline,
    ConciCardsCron,
    ConciliacaoTimeHelper,
    ConciliacaoDashboardService,
    ConciliacaoStatusService,
    MovimentoMapper,
    MovimentoFactory,
  ],
  imports: [DatabaseModule, FilialModule],
  exports: [ConciCardsCron],
})
export class ConciliacaoModule {}
