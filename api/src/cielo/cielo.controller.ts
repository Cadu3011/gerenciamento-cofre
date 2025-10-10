import {
  Controller,
  Get,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { CieloService } from './cielo.service';
import { Roles } from 'src/auth/role.decorator';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('cielo')
export class CieloController {
  constructor(private readonly cieloService: CieloService) {}

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get('details/:date')
  findSalesDetails(@Req() req: Request, @Param('date') date: string) {
    const filialUser = req['sub'];
    return this.cieloService.findSalesDetails(filialUser.filialId, date);
  }

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get()
  findSalesTotals(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const filialUser = req['sub'];

    return this.cieloService.findSalesTotals(
      filialUser.filialId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cieloService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cieloService.remove(+id);
  }
}
