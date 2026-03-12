import { Module } from '@nestjs/common';

import { TrierApiClient } from './infra/http/trier-api.client';
import { TrierCardETLPipeline } from './pipeline/trier.card-etl.pipeline.ts';
import { TrierCardExtractor } from './extract/trier.cardExtractor';
import { PrismaService } from 'src/database/prisma.service';
import { TrierCardTransform } from './transform/trier.cardTransform';
import { TrierCardLoad } from './load/trier.cardLoad';
import { TrierCardCron } from './cron/trier.cron';
import { FilialModule } from 'src/filial/filial.module';
import { DatabaseModule } from 'src/database/database.module';
import { RedeModule } from 'src/rede/rede.module';
import { RedeCardETLPipeline } from './pipeline/rede.card-etl.pipeline';
import { RedeApiClient } from './infra/http/rede-api.client';
import { RedeCardLoad } from './load/rede.cardLoad';
import { RedeCardTransform } from './transform/rede.cardTransform';
import { RedeCardsExtractor } from './extract/rede.cardExtractor';
import { JobsModule } from 'src/jobs/jobs.module';

// import { RedisService } from '../redis/redis.service'; futuramente

@Module({
  providers: [
    TrierCardETLPipeline,
    TrierCardExtractor,
    TrierCardTransform,
    TrierCardLoad,
    TrierApiClient,
    PrismaService,
    TrierCardCron,

    RedeCardETLPipeline,
    RedeCardsExtractor,
    RedeCardTransform,
    RedeCardLoad,
    RedeApiClient,
    PrismaService,

    // RedisService,  futuramente
  ],
  exports: [TrierCardETLPipeline, TrierCardCron, RedeCardETLPipeline],
  imports: [FilialModule, DatabaseModule, RedeModule, JobsModule],
})
export class CartEtlModule {}
