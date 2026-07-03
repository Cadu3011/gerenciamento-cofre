import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { SimplifiedParc } from '../transform/cielo.cardTransform';

Injectable();
export class CieloParcLoad {
  @Inject()
  private readonly Prisma: PrismaService;
  async execute(data: SimplifiedParc[]) {
    try {
      await this.Prisma.cieloParcela.createMany({
        data: data,
        skipDuplicates: true,
      });
    } catch (error) {
      console.log(`❌ Erro ao inserir itens
        
      `);
      throw error;
    }
  }
}
