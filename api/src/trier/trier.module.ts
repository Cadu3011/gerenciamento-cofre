import { Module } from '@nestjs/common';
import { TrierService } from './trier.service';
import { TrierController } from './trier.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TrierController],
  providers: [TrierService],
})
export class TrierModule {}
