import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/role.decorator';
import { TrierCardCron } from './trier/cron/trier.cron';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

@Controller('ETL')
export class CardETLController {
  @Inject()
  private readonly trierCardCron: TrierCardCron;

  @UseGuards(AuthGuard)
  @Roles(Role.GESTOR)
  @Post('trier')
  async execute(@Body() body: { date: string; filialId: number }) {
    const context = new JobExecutionContext();

    return await this.trierCardCron.executeByFilialAndDate(body, context);
  }
}
