import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/role.decorator';
import { TrierCardCron } from './cron/trier.cron';

@Controller('ETL')
export class CardETLController {
  @Inject()
  private readonly trierCardCron: TrierCardCron;

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post('trier')
  async execute(@Body() body: { date: string; filialId: number }) {
    return await this.trierCardCron.executeByFilialAndDate(body);
  }
}
