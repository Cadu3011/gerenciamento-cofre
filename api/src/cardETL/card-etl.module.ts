import { Module } from '@nestjs/common';

import { TrierApiClient } from './infra/http/trier-api.client';
import { cardETLPipeline } from './pipeline/cart-etl.pipeline.ts';
import { CardExtractor } from './extract/cardExtractor';
import { PrismaService } from 'src/database/prisma.service';

// import { RedisService } from '../redis/redis.service'; futuramente

@Module({
  providers: [
    cardETLPipeline,
    CardExtractor,
    // CardTransformer,
    // CardLoader,
    TrierApiClient,
    PrismaService,
    // RedisService,  futuramente
  ],
  exports: [cardETLPipeline],
})
export class CartEtlModule {}
