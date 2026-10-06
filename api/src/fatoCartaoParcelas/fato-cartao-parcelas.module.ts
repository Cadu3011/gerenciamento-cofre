import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ConciliacaoParcModule } from 'src/conciliacao-parc/conciliacao-parc.module';
import { FatoCartaoParcelasService } from './fato-cartao-parcelas.service';
import { FatoCartaoParcelasCron } from './fato-cartao-parcelas.cron';
import { FatoCartaoParcelasController } from './fato-cartao-parcelas.controller';

@Module({
  imports: [DatabaseModule, ConciliacaoParcModule],
  controllers: [FatoCartaoParcelasController],
  providers: [FatoCartaoParcelasService, FatoCartaoParcelasCron],
  exports: [FatoCartaoParcelasService, FatoCartaoParcelasCron],
})
export class FatoCartaoParcelasModule {}