import { Inject, Injectable } from '@nestjs/common';
import { CreateConciliacaoDto } from './dto/create-conciliacao.dto';
import { PrismaService } from 'src/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ConciliacaoService {
  @Inject()
  private readonly prisma: PrismaService;

  create(createConciliacaoDto: CreateConciliacaoDto) {
    return '';
  }

  private getHoraNormalizada(item) {
    let hora =
      item.trier?.hora || item.rede?.horaVenda || item.cielo?.timeVenda;

    if (!hora) return 0;

    // 🟡 Caso seja Date (UTC vindo do banco)
    if (hora instanceof Date) {
      const data = new Date(hora);

      // ajusta UTC → Brasil (-3h)

      const h = data.getHours().toString().padStart(2, '0');
      const m = data.getMinutes().toString().padStart(2, '0');
      const s = data.getSeconds().toString().padStart(2, '0');

      return Number(`${h}${m}${s}`);
    }

    // 🟡 Caso seja string
    if (typeof hora === 'string') {
      // remove ":"
      let normalizada = hora.replace(/:/g, '');

      // se for UTC (trier/rede), ajusta -3h manualmente
      if (item.trier || item.rede) {
        const h = Number(normalizada.slice(0, 2));
        const m = normalizada.slice(2, 4);
        const s = normalizada.slice(4, 6);

        let horaAjustada = h - 3;
        if (horaAjustada < 0) horaAjustada += 24;

        return Number(`${horaAjustada.toString().padStart(2, '0')}${m}${s}`);
      }
      return Number(normalizada);
    }

    return 0;
  }
  private getHoraFormatada(item) {
    const horaRaw =
      item.trier?.hora || item.rede?.horaVenda || item.cielo?.timeVenda;

    if (!horaRaw) return null;

    // 🟡 CASO CIELO (HHMMSS)
    if (item.cielo?.timeVenda) {
      const hora = horaRaw.toString().trim();

      if (hora.length === 6) {
        const h = hora.slice(0, 2);
        const m = hora.slice(2, 4);
        const s = hora.slice(4, 6);

        return `${h}:${m}:${s}`;
      }
    }

    // 🟡 CASO DATE (TRIER / REDE - UTC)
    if (horaRaw instanceof Date || typeof horaRaw === 'string') {
      const data = new Date(horaRaw);

      const h = data.getHours().toString().padStart(2, '0');
      const m = data.getMinutes().toString().padStart(2, '0');
      const s = data.getSeconds().toString().padStart(2, '0');

      return `${h}:${m}:${s}`;
    }

    return null;
  }

  async findByDate(filialId: number, date: string) {
    const conciliacaoItem = await this.prisma.conciliacaoItem.findMany({
      where: {
        grupo: {
          conciliacao: {
            filialId,
          },
        },
        dataReferencia: new Date(`${date}T00:00:00.000Z`),
      },
      include: {
        grupo: true,
        cielo: true,
        rede: true,
        trier: true,
      },
    });

    // 🔹 já normaliza tudo uma vez só
    const itens = conciliacaoItem.map((item) => ({
      item,
      conciliacaoId: item.grupo.conciliacaoId,
      cieloValue: item.grupo.valorCielo,
      horaNum: this.getHoraNormalizada(item),
      horaFmt: this.getHoraFormatada(item),
    }));

    // 🔹 TRIER
    const trier = itens
      .filter(({ item }) => item.origem === 'TRIER')
      .sort((a, b) => a.horaNum - b.horaNum)
      .map(({ item, horaFmt }) => ({
        id: item.id,
        grupoId: item.grupoId,
        valor: item.valor,
        hora: horaFmt,
        documentoFiscal: item.trier?.documentoFiscal,
        modalidade: item.trier?.modalidade,
        bandeira: item.trier?.bandeira,
        status: item.trier?.statusConciliacao,
        origem: item.origem,
      }));

    // 🔹 OUTROS (já ordena antes de qualquer agrupamento)
    const outrosBase = itens
      .filter(({ item }) => ['CIELO', 'REDE'].includes(item.origem))
      .sort((a, b) => a.horaNum - b.horaNum);

    // 🔹 deduplicação cielo
    const cieloMap = new Map();
    const outros = [];

    for (const entry of outrosBase) {
      const { item, cieloValue, horaFmt, horaNum } = entry;

      if (item.origem === 'CIELO' && item.cielo) {
        const isPix = item.cielo.modalidade === 'Pix';

        if (isPix) {
          // 🔥 PIX nunca deduplica
          outros.push({
            id: item.id,
            grupoId: item.grupoId,
            horaNum,
            hora: horaFmt,
            origem: item.origem,
            valor: cieloValue,
            nsu: item.cielo.nsu,
            bandeira: item.cielo.bandeira,
            modalidade: item.cielo.modalidade,
            status: item.cielo.statusConciliacao,
          });
        } else {
          const key = item.cielo.nsu;
          if (!cieloMap.has(key)) {
            cieloMap.set(key, true);
            outros.push({
              id: item.id,
              grupoId: item.grupoId,
              horaNum,
              hora: horaFmt,
              origem: item.origem,
              valor: cieloValue,
              nsu: item.cielo.nsu,
              bandeira: item.cielo.bandeira,
              modalidade: item.cielo.modalidade,
              status: item.cielo.statusConciliacao,
            });
          }
        }
      } else if (item.origem === 'REDE') {
        outros.push({
          id: item.id,
          grupoId: item.grupoId,
          horaNum,
          hora: horaFmt,
          origem: item.origem,
          valor: item.valor,
          nsu: item.rede.nsu,
          bandeira: item.rede.bandeira,
          modalidade: item.rede.modalidade,
          status: item.rede.statusConciliacao,
        });
      }
    }

    return {
      trier,
      outros,
    };
  }

  async reconcile(data: CreateConciliacaoDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Buscar grupos com itens
      const groups = await tx.conciliacaoGrupo.findMany({
        where: { id: { in: data.groupIds } },
        include: {
          itens: true,
          conciliacao: true,
        },
      });
      const conciliacao = await this.prisma.conciliacao.findUnique({
        where: {
          id: data.conciliacaoId,
        },
      });

      if (data.filialId != conciliacao.filialId)
        throw new Error('ID de Conciliação não bate com filial de origem');

      if (!groups.length) throw new Error('Grupos não encontrados');

      // 3️⃣ Junta todos os itens
      const itens = groups.flatMap((g) => g.itens);

      // 4️⃣ Calcula valores
      let valorTrier = new Decimal(0);
      let valorRede = new Decimal(0);
      let valorCielo = new Decimal(0);

      for (const item of itens) {
        if (item.origem === 'TRIER') valorTrier = valorTrier.plus(item.valor);
        if (item.origem === 'REDE') valorRede = valorRede.plus(item.valor);
        if (item.origem === 'CIELO') valorCielo = valorCielo.plus(item.valor);
      }

      const valorFinal = valorTrier.sub(valorRede.plus(valorCielo));

      // 5️⃣ Cria novo grupo
      const newGroup = await tx.conciliacaoGrupo.create({
        data: {
          conciliacaoId: data.conciliacaoId,
          metodo: 'MANUAL',
          status: 'CONCILIADO',
          valorTrier,
          valorRede,
          valorCielo,
          valorFinal,
          idempotencyKey: `|MANUAL|${Date.now()}`,
          ...(data.motivo && { motivo: data.motivo }),
        },
      });

      // 6️⃣ Move itens
      await tx.conciliacaoItem.updateMany({
        where: {
          id: { in: itens.map((i) => i.id) },
        },
        data: {
          grupoId: newGroup.id,
        },
      });

      // 7️⃣ Atualiza status na origem
      const trierIds = itens.map((i) => i.trierId).filter(Boolean);
      const redeIds = itens.map((i) => i.redeId).filter(Boolean);
      const cieloIds = itens.map((i) => i.cieloId).filter(Boolean);

      if (trierIds.length) {
        await tx.trierCartaoVendas.updateMany({
          where: { id: { in: trierIds } },
          data: { statusConciliacao: 'CONCILIADO' },
        });
      }

      if (redeIds.length) {
        await tx.redeVenda.updateMany({
          where: { id: { in: redeIds } },
          data: { statusConciliacao: 'CONCILIADO' },
        });
      }

      if (cieloIds.length) {
        await tx.cartaoVendas.updateMany({
          where: { id: { in: cieloIds } },
          data: { statusConciliacao: 'CONCILIADO' },
        });
      }

      // 8️⃣ Marca grupos antigos como CANCELADO
      await tx.conciliacaoGrupo.updateMany({
        where: { id: { in: data.groupIds } },
        data: {
          status: 'CANCELADO',
          migradoDeGrupoId: newGroup.id,
        },
      });

      return newGroup;
    });
  }

  async findByDateDivergentes(filialId: number, date: string) {
    const conciliacaoItem = await this.prisma.conciliacaoItem.findMany({
      where: {
        grupo: {
          conciliacao: {
            filialId,
          },
          status: 'DIVERGENTE',
        },
        dataReferencia: new Date(`${date}T00:00:00.000Z`),
      },
      include: {
        grupo: true,
        cielo: true,
        rede: true,
        trier: true,
      },
    });

    // 🔹 já normaliza tudo uma vez só
    const itens = conciliacaoItem.map((item) => ({
      item,
      conciliacaoId: item.grupo.conciliacaoId,
      cieloValue: item.grupo.valorCielo,
      horaNum: this.getHoraNormalizada(item),
      horaFmt: this.getHoraFormatada(item),
    }));

    const cieloMap = new Map();
    const resultado = [];

    for (const entry of itens) {
      const { item, cieloValue, horaFmt, horaNum } = entry;

      // 🔹 TRIER
      if (item.origem === 'TRIER') {
        resultado.push({
          id: item.id,
          grupoId: item.grupoId,
          horaNum,
          hora: horaFmt,
          valor: item.valor,
          documentoFiscal: item.trier?.documentoFiscal,
          modalidade: item.trier?.modalidade,
          bandeira: item.trier?.bandeira,
          status: item.trier?.statusConciliacao,
          origem: item.origem,
        });
      }

      // 🔹 CIELO
      else if (item.origem === 'CIELO' && item.cielo) {
        const isPix = item.cielo.modalidade === 'Pix';

        if (isPix) {
          resultado.push({
            id: item.id,
            grupoId: item.grupoId,
            horaNum,
            hora: horaFmt,
            origem: item.origem,
            valor: cieloValue,
            nsu: item.cielo.nsu,
            bandeira: item.cielo.bandeira,
            modalidade: item.cielo.modalidade,
            status: item.cielo.statusConciliacao,
          });
        } else {
          const key = item.cielo.nsu;

          if (!cieloMap.has(key)) {
            cieloMap.set(key, true);

            resultado.push({
              id: item.id,
              grupoId: item.grupoId,
              horaNum,
              hora: horaFmt,
              origem: item.origem,
              valor: cieloValue,
              nsu: item.cielo.nsu,
              bandeira: item.cielo.bandeira,
              modalidade: item.cielo.modalidade,
              status: item.cielo.statusConciliacao,
            });
          }
        }
      }

      // 🔹 REDE
      else if (item.origem === 'REDE') {
        resultado.push({
          id: item.id,
          grupoId: item.grupoId,
          horaNum,
          hora: horaFmt,
          origem: item.origem,
          valor: item.valor,
          nsu: item.rede.nsu,
          bandeira: item.rede.bandeira,
          modalidade: item.rede.modalidade,
          status: item.rede.statusConciliacao,
        });
      }
    }

    // 🔥 ORDENAÇÃO FINAL GLOBAL
    resultado.sort((a, b) => a.horaNum - b.horaNum);

    return resultado;
  }
}
