import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { MovementModule } from './movement/movement.module';
import { AuthModule } from './auth/auth.module';
import { FilialModule } from './filial/filial.module';
import { AmountModule } from './amount/amount.module';
import { BalanceFisicModule } from './balance-fisic/balance-fisic.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RedeModule } from './rede/rede.module';
import { CieloModule } from './cielo/cielo.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UsersModule,
    DatabaseModule,
    MovementModule,
    AuthModule,
    FilialModule,
    AmountModule,
    BalanceFisicModule,
    RedeModule,
    CieloModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
