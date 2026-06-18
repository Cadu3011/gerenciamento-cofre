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

import { RedeApiClient } from './rede/infra/http/rede-api.client';

import { CardETLController } from './card-etl.controller';
import { TrierCardETLPipeline } from './trier/pipeline/trier.card-etl.pipeline';

import { RedeParcCron } from './rede/cron/rede.cron';
import { RedeParcExtractor } from './rede/extract/rede.cardExtractor';
import { RedeParcLoad } from './rede/load/rede.cardLoad';
import { RedeParcETLPipeline } from './rede/pipeline/rede.card-etl.pipeline';
import { RedeParcTransform } from './rede/transform/rede.cardTransform';

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
    RedeParcCron,
    RedeParcETLPipeline,
    RedeParcExtractor,
    RedeParcTransform,
    RedeParcLoad,
    RedeApiClient,
    PrismaService,

    // RedisService,  futuramente
  ],
  exports: [
    TrierCardETLPipeline,
    TrierCardCron,
    RedeParcETLPipeline,
    RedeParcCron,
  ],
  imports: [FilialModule, DatabaseModule, RedeModule],
})
export class ParcEtlModule {}
