import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/role.decorator';
import { TrierParcCron } from './trier/cron/trier.cron';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

@Controller('ETL')
export class ParcETLController {
  @Inject()
  private readonly trierParcCron: TrierParcCron;

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post('trierParc')
  async execute(@Body() body: { date: string; filialId: number }) {
    const context = new JobExecutionContext();
    return await this.trierParcCron.executeByFilialAndDate(body, context);
  }
}
