import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  controllers: [JobsController],
  providers: [JobsService],
  imports: [DatabaseModule],
})
export class JobsModule {}
