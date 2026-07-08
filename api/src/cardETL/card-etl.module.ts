import { Module } from '@nestjs/common';

import { TrierApiClient } from './trier/infra/http/trier-api.client';
import { TrierCardExtractor } from './trier/extract/trier.cardExtractor';
import { PrismaService } from 'src/database/prisma.service';
import { TrierCardTransform } from './trier/transform/trier.cardTransform';
import { TrierCardLoad } from './trier/load/trier.cardLoad';
import { TrierCardCron } from './trier/cron/trier.cron';
import { FilialModule } from 'src/filial/filial.module';
import { DatabaseModule } from 'src/database/database.module';
import { RedeModule } from 'src/rede/rede.module';
import { RedeCardETLPipeline } from './rede/pipeline/rede.card-etl.pipeline';
import { RedeApiClient } from './rede/infra/http/rede-api.client';
import { RedeCardLoad } from './rede/load/rede.cardLoad';
import { RedeCardTransform } from './rede/transform/rede.cardTransform';
import { RedeCardsExtractor } from './rede/extract/rede.cardExtractor';

import { RedeCardCron } from './rede/cron/rede.cron';
import { CardETLController } from './card-etl.controller';
import { TrierCardETLPipeline } from './trier/pipeline/trier.card-etl.pipeline';

// import { RedisService } from '../redis/redis.service'; futuramente

@Module({
  controllers: [CardETLController],
  providers: [
    TrierCardETLPipeline,
    TrierCardExtractor,
    TrierCardTransform,
    TrierCardLoad,
    TrierApiClient,
    PrismaService,
    TrierCardCron,
    RedeCardCron,
    RedeCardETLPipeline,
    RedeCardsExtractor,
    RedeCardTransform,
    RedeCardLoad,
    RedeApiClient,
    PrismaService,

    // RedisService,  futuramente
  ],
  exports: [
    TrierCardETLPipeline,
    TrierCardCron,
    RedeCardETLPipeline,
    RedeCardCron,
  ],
  imports: [FilialModule, DatabaseModule, RedeModule],
})
export class CartEtlModule {}
