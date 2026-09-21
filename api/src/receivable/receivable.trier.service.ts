import { Inject, Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { authTrier } from 'src/auth/authTrier/loginTrier';
import { PrismaService } from 'src/database/prisma.service';
import {
  ADQUIRENTE_BRASILCARD,
  ADQUIRENTE_CIELO,
  ADQUIRENTE_INDEFINIDO,
  ADQUIRENTE_PAGGPIX,
} from './bandeira-adquirente.mapper';

interface CreateRecebimentoInput {
  filialId: number;
  adquirente: string;
  dataRecebimento: Date;
  valor: Decimal;
  idContaBanco: number;
  token: string;
  parcela?: number;
  totalParcelas?: number;
  documentoFiscal?: number | null;
  bandeira?: string | null;
}

@Injectable()
export class ReceivableTrierService {
  private readonly logger = new Logger(ReceivableTrierService.name);

  @Inject()
  private readonly prisma: PrismaService;

  // Ajustar conforme categorias de "recebimento" existentes no Trier
  private readonly CATEGORIA_RECEBIMENTO = 98;
  private readonly CATEGORIA_RECEBIMENTO_PAI = 65;

  private readonly urlTrier = '192.168.1.253';

  // Recebimentos destes adquirentes, das filiais mapeadas, são lançados no
  // banco (idBancoRecebimentos) da filial destino indicada.
  private readonly BANCO_DESTINO_POR_ADQUIRENTE: Record<
    string,
    Record<number, number>
  > = {
    [ADQUIRENTE_CIELO]: { 5: 1, 7: 1 },
    [ADQUIRENTE_PAGGPIX]: { 7: 1 },
  };

  private async resolveIdContaBanco(
    recebivel: {
      filialId: number;
      adquirente: string;
    },
    idBancoPadrao: number,
  ): Promise<number> {
    const filialDestinoId =
      this.BANCO_DESTINO_POR_ADQUIRENTE[recebivel.adquirente]?.[
        recebivel.filialId
      ];

    if (!filialDestinoId) return idBancoPadrao;

    const filialDestino = await this.prisma.filial.findUnique({
      where: { id: filialDestinoId },
    });
    if (!filialDestino?.idBancoRecebimentos) {
      throw new Error(
        `Filial ${filialDestinoId} sem idBancoRecebimentos configurado - destino dos recebimentos ${recebivel.adquirente} da filial ${recebivel.filialId}`,
      );
    }

    return filialDestino.idBancoRecebimentos;
  }

  async send(recebivelId: number) {
    const recebivel = await this.prisma.receivable.findUnique({
      where: { id: recebivelId },
      include: { filial: true, trierParcelas: true },
    });

    if (!recebivel) {
      throw new Error(`Recebível ${recebivelId} não encontrado`);
    }

    if (recebivel.movimentoTrierId) {
      this.logger.warn(
        `Recebível ${recebivelId} já possui movimento Trier (${recebivel.movimentoTrierId}). Ignorando.`,
      );
      return recebivel;
    }

    const filial = recebivel.filial;
    if (!filial.idBancoRecebimentos) {
      throw new Error(
        `Filial ${filial.id} sem idBancoRecebimentos configurado - impossível lançar recebimento`,
      );
    }

    const token = (
      await authTrier({
        login: '95',
        password: 'cadu3011',
      })
    ).token;

    const idContaBanco = await this.resolveIdContaBanco(
      recebivel,
      filial.idBancoRecebimentos,
    );

    const porParcela =
      recebivel.adquirente === ADQUIRENTE_BRASILCARD ||
      recebivel.adquirente === ADQUIRENTE_INDEFINIDO;
    const parcelaTrier = porParcela ? recebivel.trierParcelas[0] : undefined;

    const movimentoId = await this.createRecebimento({
      filialId: recebivel.filialId,
      adquirente: recebivel.adquirente,
      dataRecebimento: recebivel.dataRecebimento,
      valor: recebivel.valorEsperado,
      idContaBanco,
      token,
      parcela: parcelaTrier?.parcela,
      totalParcelas: parcelaTrier?.totalParcelas,
      documentoFiscal: parcelaTrier?.documentoFiscal,
      bandeira:
        recebivel.adquirente === ADQUIRENTE_INDEFINIDO
          ? parcelaTrier?.bandeira
          : undefined,
    });

    if (typeof movimentoId === 'number') {
      const atualizado = await this.prisma.receivable.update({
        where: { id: recebivel.id },
        data: { movimentoTrierId: movimentoId, status: 'ENVIADO_ERP' },
      });
      this.logger.log(
        `Recebível ${recebivel.id} enviado ao Trier. Movimento ${movimentoId}`,
      );
      return atualizado;
    }

    throw new Error(movimentoId);
  }

  async createRecebimento(move: CreateRecebimentoInput) {
    const myHeaders = new Headers();
    myHeaders.append('Accept', 'application/json, text/plain, */*');
    myHeaders.append('Accept-Language', 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7');
    myHeaders.append('Authorization', `Bearer ${move.token}`);
    myHeaders.append('Connection', 'keep-alive');
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Origin', `http://${this.urlTrier}:4647`);
    myHeaders.append(
      'Referer',
      `http://${this.urlTrier}:4647/web-drogaria-app/`,
    );
    myHeaders.append(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    );

    const dataISO = move.dataRecebimento.toISOString().slice(0, 10);
    let descricao = `RECEBIMENTO ${move.adquirente} ${dataISO} FILIAL ${move.filialId}`;

    if (move.parcela != null && move.totalParcelas != null) {
      descricao += ` (${move.parcela}/${move.totalParcelas})`;
      if (move.documentoFiscal != null) {
        descricao += ` ${move.documentoFiscal}`;
      }
    }

    if (move.bandeira) {
      descricao += ` ${move.bandeira}`;
    }

    const raw = JSON.stringify({
      filial: {
        codFilial: move.filialId,
      },
      descricao: descricao,
      dataVencimento: new Date(
        new Date(move.dataRecebimento).getTime() + 3 * 60 * 60 * 1000,
      ).toISOString(),
      valorLancamento: move.valor.toNumber(),
      conta: {
        tipoGravacao: 'LEITURA_E_ESCRITA',
        situacao: 'ATIVO',
        id: move.idContaBanco,
      },
      categoria: {
        id: this.CATEGORIA_RECEBIMENTO,
        tipo: 'RECEITA',
        situacao: 'ATIVO',
        tipoGravacao: 'SOMENTE_LEITURA',
        categoriaFebrafar: 'CARTOES',
        tipoOperacional: 'OPERACIONAL',
        categoriaPai: {
          id: this.CATEGORIA_RECEBIMENTO_PAI,
        },
        nivel: 2,
      },
      status: 'NAO_EFETIVADO',
    });

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    };

    try {
      const resp = await fetch(
        `http://${this.urlTrier}:4647/web-drogaria/financeiro/movimentacoes`,
        requestOptions,
      );
      const moveIdTrier = await resp.json();
      if (moveIdTrier.status === 400)
        throw new Error(`Erro ao processar movimentação: ${moveIdTrier}`);
      return moveIdTrier.id;
    } catch (error) {
      return (error as Error).message;
    }
  }
}
