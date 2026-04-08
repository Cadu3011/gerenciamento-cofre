import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class MatchService {
  @Inject()
  private readonly prisma: PrismaService;

  private horaParaSegundos(hora: string) {
    const [h, m, s] = hora.split(':').map(Number);
    return h * 3600 + m * 60 + s;
  }

  private timeVendaParaSegundos(timeVenda: string) {
    const h = Number(timeVenda.substring(0, 2));
    const m = Number(timeVenda.substring(2, 4));
    const s = Number(timeVenda.substring(4, 6));

    return h * 3600 + m * 60 + s;
  }

  private LIMITE_DIFERENCA = 300;

  async getCardsTrier(date: string, filialId: number) {
    return await this.prisma.trierCartaoVendas.findMany({
      where: {
        dataEmissao: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
        filialId: filialId,
        statusConciliacao: { not: 'CONCILIADO' },
      },
    });
  }
  async getCardsRede(date: string, filialId: number) {
    return this.prisma.redeVenda.findMany({
      where: {
        dataVenda: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
        filialId: filialId,
        statusConciliacao: { not: 'CONCILIADO' },
      },
    });
  }
  async getCardsCielo(date: string, filialId: number) {
    const estCielo = await this.prisma.filial.findUnique({
      where: { id: filialId },
    });
    return this.prisma.cartaoVendas.groupBy({
      by: [
        'codigoTransacao',
        'estabelecimento',
        'timeVenda',
        'modalidade',
        'bandeira',
        'dataVenda',
        'taxaAdministrativa',
      ],
      where: {
        dataVenda: date,
        estabelecimento: String(estCielo.idCielo),
        statusConciliacao: { not: 'CONCILIADO' },
      },
      _sum: {
        valorBruto: true,
      },
      _min: {
        id: true, // 👈 pega um id do grupo
      },
    });
  }

  async matchMovements(filialId: number, date: string) {
    const cardsTrier = await this.getCardsTrier(date, filialId);
    const cardsRede = await this.getCardsRede(date, filialId);
    const cardsCielo = await this.getCardsCielo(date, filialId);

    const redeUsados = new Set<number>();
    const cieloUsados = new Set<number>();
    const grupos: any[] = [];

    for (const trier of cardsTrier) {
      let match = null;
      let origem = null;

      //  Tenta Rede primeiro
      const indexRede = cardsRede.findIndex((rede, i) => {
        if (redeUsados.has(i)) return false;

        if (Number(trier.valor) !== Number(rede.valor)) return false;
        if (!trier.hora || !rede.horaVenda) return false;

        const diff = Math.abs(
          this.horaParaSegundos(trier.hora.toISOString().substring(11, 19)) -
            this.horaParaSegundos(
              rede.horaVenda.toISOString().substring(11, 19),
            ),
        );

        return diff <= this.LIMITE_DIFERENCA;
      });

      if (indexRede !== -1) {
        redeUsados.add(indexRede);
        match = cardsRede[indexRede];
        origem = 'REDE';
      } else {
        //  Só tenta Cielo se não achou na Rede
        const indexCielo = cardsCielo.findIndex((cielo, i) => {
          if (cieloUsados.has(i)) return false;

          if (Number(trier.valor) !== Number(cielo._sum.valorBruto))
            return false;
          if (!trier.hora || !cielo.timeVenda) return false;

          const diff = Math.abs(
            this.horaParaSegundos(trier.hora.toTimeString().substring(0, 8)) -
              this.timeVendaParaSegundos(cielo.timeVenda),
          );

          return diff <= this.LIMITE_DIFERENCA;
        });

        if (indexCielo !== -1) {
          cieloUsados.add(indexCielo);

          const grupoCielo = cardsCielo[indexCielo];

          // 🔥 busca todos os registros reais daquele grupo
          const registrosCielo = await this.prisma.cartaoVendas.findMany({
            where: {
              codigoTransacao: grupoCielo.codigoTransacao,
              estabelecimento: grupoCielo.estabelecimento,
              timeVenda: grupoCielo.timeVenda,
              modalidade: grupoCielo.modalidade,
              bandeira: grupoCielo.bandeira,
              dataVenda: grupoCielo.dataVenda,
              taxaAdministrativa: grupoCielo.taxaAdministrativa,
            },
            select: {
              id: true,
            },
          });

          match = {
            ...grupoCielo,
            ids: registrosCielo.map((r) => r.id), // 👈 TODOS os IDs
          };

          origem = 'CIELO';
        }
      }

      grupos.push({
        status: match ? 'CONCILIADO' : 'DIVERGENTE',
        origemMatch: origem,
        trier,
        rede: origem === 'REDE' ? match : null,
        cielo: origem === 'CIELO' ? match : null,
      });
    }

    //  Sobrou na Rede
    cardsRede.forEach((rede, i) => {
      if (!redeUsados.has(i)) {
        grupos.push({
          status: 'DIVERGENTE',
          origemMatch: 'REDE',
          trier: null,
          rede,
          cielo: null,
        });
      }
    });

    //  Sobrou na Cielo
    for (let i = 0; i < cardsCielo.length; i++) {
      if (!cieloUsados.has(i)) {
        const grupoCielo = cardsCielo[i];

        const registrosCielo = await this.prisma.cartaoVendas.findMany({
          where: {
            codigoTransacao: grupoCielo.codigoTransacao,
            estabelecimento: grupoCielo.estabelecimento,
            timeVenda: grupoCielo.timeVenda,
            modalidade: grupoCielo.modalidade,
            bandeira: grupoCielo.bandeira,
            dataVenda: grupoCielo.dataVenda,
            taxaAdministrativa: grupoCielo.taxaAdministrativa,
          },
          select: { id: true },
        });

        grupos.push({
          status: 'DIVERGENTE',
          origemMatch: 'CIELO',
          trier: null,
          rede: null,
          cielo: {
            ...grupoCielo,
            ids: registrosCielo.map((r) => r.id), // 🔥 agora tem ids
          },
        });
      }
    }

    return grupos;
  }
}
