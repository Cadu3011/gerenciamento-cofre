import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { MovementModule } from './movement/movement.module';
import { AuthModule } from './auth/auth.module';
import { FilialModule } from './filial/filial.module';
import { AmountModule } from './amount/amount.module';

@Module({
  imports: [UsersModule,DatabaseModule, MovementModule, AuthModule, FilialModule, AmountModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
