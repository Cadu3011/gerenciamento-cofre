import { Module } from '@nestjs/common';
import { ReceivableController } from './receivable.controller';
import { ReceivableGenerateService } from './receivable.generate.service';
import { ReceivableTrierService } from './receivable.trier.service';
import { ReceivableCron } from './receivable.cron';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReceivableController],
  providers: [
    ReceivableGenerateService,
    ReceivableTrierService,
    ReceivableCron,
  ],
  exports: [ReceivableCron],
})
export class ReceivableModule {}
