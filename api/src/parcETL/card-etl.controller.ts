import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/role.decorator';
import { TrierParcCron } from './trier/cron/trier.cron';

@Controller('ETL')
export class ParcETLController {
  @Inject()
  private readonly trierParcCron: TrierParcCron;

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post('trier')
  async execute(@Body() body: { date: string; filialId: number }) {
    return await this.trierParcCron.executeByFilialAndDate(body);
  }
}
