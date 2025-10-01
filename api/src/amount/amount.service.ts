import { Inject, Injectable } from '@nestjs/common';
import { CreateAmountDto } from './dto/create-amount.dto';
import { PrismaService } from 'src/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AmountService {
  @Inject()
  private readonly Prisma: PrismaService;

  async createOrUpdate(createAmountDto: CreateAmountDto) {
    const date: Date = new Date();
    const dateFormat: string = date.toISOString();
    const amount = await this.findByDate(dateFormat, createAmountDto.filialId);

    if (amount.length === 1) {
      const newBalance = new Decimal(amount[0].balance).add(
        createAmountDto.balance,
      );
      await this.Prisma.dailyBalance.update({
        where: { id: amount[0].id },
        data: { balance: newBalance },
      });
      return newBalance;
    } else {
      const lastAmount = await this.findLast(createAmountDto.filialId);
      if (lastAmount) {
        const newBalance = new Decimal(createAmountDto.balance).add(
          lastAmount.balance,
        );
        await this.Prisma.dailyBalance.create({
          data: {
            filialId: createAmountDto.filialId,
            balance: newBalance,
            createdAt: date,
          },
        });
        return newBalance;
      } else {
        const newBalance = new Decimal(0).add(createAmountDto.balance);
        await this.Prisma.dailyBalance.create({
          data: {
            filialId: createAmountDto.filialId,
            balance: newBalance,
            createdAt: date,
          },
        });
        return newBalance;
      }
    }
  }
  async findLast(filialId: number) {
    const lastItem = await this.Prisma.dailyBalance.findFirst({
      where: {
        filialId: filialId,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return lastItem;
  }
  async findAnt(filialId: number) {
    const date: Date = new Date();
    const dateFormat: string = date.toISOString();
    const amount = await this.findByDate(dateFormat, filialId);
    if (amount.length === 1) {
      return this.Prisma.dailyBalance.findFirst({
        where: {
          filialId: filialId,
        },
        orderBy: {
          id: 'desc',
        },
        skip: 1,
      });
    }
    return this.findLast(filialId);
  }
  findByDate(date?: string, filialId?: number) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    const extrato = this.Prisma.dailyBalance.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        filialId: filialId,
      },
    });
    return extrato;
  }
  async findAll(dateInit: string, dateFinal: string, filialId?: number) {
    const startOfDay = new Date(dateInit);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateFinal);
    endOfDay.setHours(23, 59, 59, 999);
    const whereFilial = filialId ? { id: Number(filialId) } : {};
    const extrato = await this.Prisma.filial.findMany({
      where: whereFilial,
      include: {
        saldo: {
          where:
            startOfDay && endOfDay
              ? {
                  createdAt: {
                    gte: startOfDay,
                    lte: new Date(endOfDay.setDate(endOfDay.getDate() + 1)),
                  },
                }
              : undefined,
        },
        movements:
          startOfDay && endOfDay
            ? {
                where: {
                  updatedAt: {
                    gte: startOfDay,
                    lte: new Date(endOfDay.setDate(endOfDay.getDate() + 1)),
                  },
                },
              }
            : true,
        balanceFisic:
          startOfDay && endOfDay
            ? {
                where: {
                  createdAt: {
                    gte: startOfDay,
                    lte: new Date(endOfDay.setDate(endOfDay.getDate() + 1)),
                  },
                },
              }
            : true,
      },
    });

    return extrato.map((f) => ({
      filial: {
        id: f.id,
        name: f.name,
      },
      saldo: f.saldo.map((s) => {
        // filtro por "mesmo dia" do saldo
        const start = new Date(s.createdAt);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);

        const movements = f.movements.filter(
          (m) => m.updatedAt >= start && m.updatedAt <= end,
        );

        const balanceFisic = f.balanceFisic.filter(
          (b) => b.createdAt >= start && b.createdAt <= end,
        );

        return {
          ...s,
          movements,
          balanceFisic,
        };
      }),
    }));
  }

  findOne(id: number) {
    return this.Prisma.dailyBalance.findUnique({ where: { id } });
  }

  remove(id: number) {
    return `This action removes a #${id} amount`;
  }
}
