import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { MovementModule } from './movement/movement.module';

@Module({
  imports: [UsersModule,DatabaseModule, MovementModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
