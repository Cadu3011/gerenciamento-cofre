import { Module } from '@nestjs/common';

import { TrierApiClient } from './trier/infra/http/trier-api.client';

import { PrismaService } from 'src/database/prisma.service';

import { FilialModule } from 'src/filial/filial.module';
import { DatabaseModule } from 'src/database/database.module';
import { RedeModule } from 'src/rede/rede.module';

import { RedeApiClient } from './rede/infra/http/rede-api.client';

import { ParcETLController } from './card-etl.controller';
import { TrierParcETLPipeline } from './trier/pipeline/trier.card-etl.pipeline';

import { RedeParcCron } from './rede/cron/rede.cron';
import { RedeParcExtractor } from './rede/extract/rede.cardExtractor';
import { RedeParcLoad } from './rede/load/rede.cardLoad';
import { RedeParcETLPipeline } from './rede/pipeline/rede.card-etl.pipeline';
import { RedeParcTransform } from './rede/transform/rede.cardTransform';
import { TrierParcCron } from './trier/cron/trier.cron';
import { TrierParcExtractor } from './trier/extract/trier.cardExtractor';
import { TrierParcLoad } from './trier/load/trier.cardLoad';
import { TrierParcTransform } from './trier/transform/trier.cardTransform';
import { CieloParcETLPipeline } from './cielo/pipeline/cielo.pipeline';
import { CieloParcTransform } from './cielo/transform/cielo.cardTransform';
import { CieloParcLoad } from './cielo/load/cielo.cardLoad';
import { CieloParcETLCron } from './cielo/cron/cielo.cron';

// import { RedisService } from '../redis/redis.service'; futuramente

@Module({
  controllers: [ParcETLController],
  providers: [
    TrierParcETLPipeline,
    TrierParcExtractor,
    TrierParcTransform,
    TrierParcLoad,
    TrierApiClient,
    PrismaService,
    TrierParcCron,
    RedeParcCron,
    RedeParcETLPipeline,
    RedeParcExtractor,
    RedeParcTransform,
    RedeParcLoad,
    RedeApiClient,
    CieloParcETLPipeline,
    CieloParcTransform,
    CieloParcLoad,
    CieloParcETLCron,
    PrismaService,

    // RedisService,  futuramente
  ],
  exports: [
    TrierParcETLPipeline,
    TrierParcCron,
    RedeParcETLPipeline,
    RedeParcCron,
    CieloParcETLCron,
  ],
  imports: [FilialModule, DatabaseModule, RedeModule],
})
export class ParcEtlModule {}
