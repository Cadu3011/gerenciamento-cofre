import { Module } from '@nestjs/common';

import { TrierApiClient } from './infra/http/trier-api.client';
import { CardETLPipeline } from './pipeline/card-etl.pipeline.ts';
import { CardExtractor } from './extract/cardExtractor';
import { PrismaService } from 'src/database/prisma.service';
import { CardTransform } from './transform/cardTransform';
import { CardLoad } from './load/cardLoad';
import { CardCron } from './cron/trier.cron';
import { FilialModule } from 'src/filial/filial.module';
import { DatabaseModule } from 'src/database/database.module';

// import { RedisService } from '../redis/redis.service'; futuramente

@Module({
  providers: [
    CardETLPipeline,
    CardExtractor,
    CardTransform,
    CardLoad,
    TrierApiClient,
    PrismaService,
    CardCron,
    // RedisService,  futuramente
  ],
  exports: [CardETLPipeline, CardCron],
  imports: [FilialModule, DatabaseModule],
})
export class CartEtlModule {}
