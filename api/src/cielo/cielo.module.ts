import { Module } from '@nestjs/common';
import { CieloService } from './cielo.service';
import { CieloController } from './cielo.controller';
import { CieloTransformSalesService } from './cielo-extratc-vendas.service';
import { DatabaseModule } from 'src/database/database.module';
import { FilialModule } from 'src/filial/filial.module';

@Module({
  imports: [DatabaseModule, FilialModule],
  controllers: [CieloController],
  providers: [CieloService, CieloTransformSalesService],
})
export class CieloModule {}
