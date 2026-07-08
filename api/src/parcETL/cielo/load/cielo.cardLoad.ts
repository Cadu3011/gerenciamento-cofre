import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { SimplifiedParc } from '../transform/cielo.cardTransform';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

Injectable();
export class CieloParcLoad {
  private readonly logger = new Logger(CieloParcLoad.name);

  @Inject()
  private readonly Prisma: PrismaService;
  async execute(data: SimplifiedParc[]) {
    try {
      const movements: SimplifiedParc[] = [];
      const codTrans = [...new Set(data.map((x) => String(x.codigoTransacao)))];
      const estabelecimentos = [
        ...new Set(data.map((x) => String(x.estabelecimento))),
      ];
      const vendas = await this.Prisma.cartaoVendas.findMany({
        where: {
          codigoTransacao: {
            in: [...codTrans],
          },
          estabelecimento: { in: [...estabelecimentos] },
        },
      });

      const vendasMap = new Map(vendas.map((v) => [v.codigoTransacao, v]));
      for (const item of data) {
        const venda = vendasMap.get(String(item.codigoTransacao));
        if (!venda) {
          throw new Error(
            `Venda não encontrada. CodTransação=${item.codigoTransacao} Filial=${item.filialId}`,
          );
        }
        movements.push({ ...item, vendaId: venda.id });
      }

      const result = await this.Prisma.cieloParcela.createMany({
        data: movements.map(({ estabelecimento, ...movement }) => movement),
        skipDuplicates: true,
      });
      this.logger.log('LOAD ✅');
      return result.count;
    } catch (error) {
      this.logger.error(`❌ Erro ao inserir itens, ${error}`);
      throw error;
    }
  }
}
