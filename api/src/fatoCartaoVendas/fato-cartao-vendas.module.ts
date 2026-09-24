import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { FatoCartaoVendasService } from './fato-cartao-vendas.service';
import { FatoCartaoVendasCron } from './fato-cartao-vendas.cron';
import { FatoCartaoVendasController } from './fato-cartao-vendas.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [FatoCartaoVendasController],
  providers: [FatoCartaoVendasService, FatoCartaoVendasCron],
  exports: [FatoCartaoVendasService, FatoCartaoVendasCron],
})
export class FatoCartaoVendasModule {}