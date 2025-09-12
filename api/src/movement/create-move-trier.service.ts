import { Inject, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { AuthService } from 'src/auth/auth.service';
export interface iMoveTrier {
  idFilial: number;
  descricao: string;
  filialName: string;
  idCofre: number;
  valor: Decimal;
  idCategoria: number;
  date: Date;
  token: string;
}
@Injectable()
export class MoveTrier {
  @Inject()
  private readonly authService: AuthService;

  async createDesp(move: iMoveTrier) {
    const myHeaders = new Headers();
    myHeaders.append('Accept', 'application/json, text/plain, */*');
    myHeaders.append('Accept-Language', 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7');
    myHeaders.append('Authorization', `Bearer ${move.token}`);
    myHeaders.append('Connection', 'keep-alive');
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Origin', 'http://192.168.1.253:4647');
    myHeaders.append('Referer', 'http://192.168.1.253:4647/web-drogaria-app/');
    myHeaders.append(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    );
    const raw = JSON.stringify({
      filial: {
        codFilial: move.idFilial,
        ativa: true,
      },
      descricao: move.descricao,
      fornecedor: {
        codFornecedor: 41,
      },
      numDocumento: '',
      dataVencimento: move.date,
      valorLancamento: move.valor,
      conta: {
        tipoGravacao: 'SOMENTE_LEITURA',
        situacao: 'ATIVO',
        id: move.idCofre,
        titulo: `Cofre FILIAL ${move.idFilial} - ${move.filialName}`,
        tipo: 'CONTA_COFRE',
        tipoCompartilhamento: 'NAO_COMPARTILHADO',
      },
      categoria: {
        id: move.idCategoria,
        situacao: 'ATIVO',
        tipoGravacao: 'LEITURA_E_ESCRITA',
        tipoOperacional: 'OPERACIONAL',
        tipoCusto: 'DESPESA',
        tipoClassificacao: 'VARIAVEL',
      },
      centroCusto: null,
      vlrDescfinanc: 0,
      vlrTaxaBoleto: 0,
      status: 'EFETIVADO',
      recorrente: false,
      dataBaixa: move.date,
      valorBaixa: move.valor,
      flgTaxaBoleto: 'N',
    });

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    };
    try {
      const resp = await fetch(
        'http://177.200.115.10:4647/web-drogaria/financeiro/movimentacoes',
        requestOptions,
      );
      const moveIdTrier = await resp.json();
      return moveIdTrier.id;
    } catch (error) {
      return error;
    }
  }
  async deleteMoves(id: number, token: string) {
    const myHeaders = new Headers();
    myHeaders.append('Accept', 'application/json, text/plain, */*');
    myHeaders.append('Accept-Language', 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7');
    myHeaders.append('Authorization', `Bearer ${token}`);
    myHeaders.append('Connection', 'keep-alive');
    myHeaders.append('Origin', 'http://192.168.1.253:4647');
    myHeaders.append('Referer', 'http://192.168.1.253:4647/web-drogaria-app/');
    myHeaders.append(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    );

    const requestOptions: RequestInit = {
      method: 'DeLETE',
      headers: myHeaders,
      redirect: 'follow',
    };
    try {
      const resp = await fetch(
        `http://192.168.1.253:4647/web-drogaria/financeiro/movimentacoes/${id}`,
        requestOptions,
      );
      const moveDelIdTrier = await resp.json();
      return moveDelIdTrier.id;
    } catch (error) {
      return error;
    }
  }
}
