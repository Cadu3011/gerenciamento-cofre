import {
  Controller,
  Get,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { RedeService } from './rede.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/role.decorator';
import { Role } from '@prisma/client';

@Controller('rede')
export class RedeController {
  constructor(private readonly redeService: RedeService) {}

  @UseGuards(AuthGuard)
  @Roles(Role.OPERADOR)
  @Get('details/:date')
  findSalesDetails(@Req() req: Request, @Param('date') date: string) {
    const filialUser = req['sub'];
    return this.redeService.findSalesDetails(filialUser.filialId, date);
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

    return this.redeService.findSalesTotals(
      filialUser.filialId,
      startDate,
      endDate,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.redeService.remove(+id);
  }
}
