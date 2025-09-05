import { Decimal } from '@prisma/client/runtime/library';

interface iMoveTrier {
  idFilial: number;
  descricao: string;
  filialName: string;
  idCofre: number;
  valor: Decimal;
  idCategoria: number;
  date: Date;
}

export class MoveTrier {
  static async createDesp(move: iMoveTrier) {
    const myHeaders = new Headers();
    myHeaders.append('Accept', 'application/json, text/plain, */*');
    myHeaders.append('Accept-Language', 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7');
    myHeaders.append(
      'Authorization',
      'Bearer eyJhbGciOiJIUzI1NiJ9.eyJjb2RfZmlsaWFsIjoiOTkiLCJ1c2VyX25hbWUiOiJDQVJMT1MgRURVQVJETyBSQU1PUyBCT1JHRVMiLCJzY29wZSI6WyJkcm9nYXJpYSJdLCJ0b2tlbl9pbnRlZ3JhY2FvIjoiZmFsc2UiLCJ0aXBvX2ZpbGlhbCI6IkNFTlRSQUwiLCJleHAiOjE3NTcxNTgxMTYsImlhdCI6MTc1NzA3MTcxNiwianRpIjoiM2RkODE0NDUtMjViZi00NGMwLThhMTctYmU0ODIzZGQ4MjA5IiwiY2xpZW50X2lkIjoic2dmIiwiY29kX3VzdWFyaW8iOiI5NSIsImF1dGhvcml0aWVzIjpbIkFETUlOIl19.20gmR4LK-FVR8wh1Qvwu5Oy-ABTWby_hGSrBX6xjzZk',
    );
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
  static async deleteMoves(id: number) {
    const myHeaders = new Headers();
    myHeaders.append('Accept', 'application/json, text/plain, */*');
    myHeaders.append('Accept-Language', 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7');
    myHeaders.append(
      'Authorization',
      'Bearer eeyJhbGciOiJIUzI1NiJ9.eyJjb2RfZmlsaWFsIjoiOTkiLCJ1c2VyX25hbWUiOiJDQVJMT1MgRURVQVJETyBSQU1PUyBCT1JHRVMiLCJzY29wZSI6WyJkcm9nYXJpYSJdLCJ0b2tlbl9pbnRlZ3JhY2FvIjoiZmFsc2UiLCJ0aXBvX2ZpbGlhbCI6IkNFTlRSQUwiLCJleHAiOjE3NTcxNTgxMTYsImlhdCI6MTc1NzA3MTcxNiwianRpIjoiM2RkODE0NDUtMjViZi00NGMwLThhMTctYmU0ODIzZGQ4MjA5IiwiY2xpZW50X2lkIjoic2dmIiwiY29kX3VzdWFyaW8iOiI5NSIsImF1dGhvcml0aWVzIjpbIkFETUlOIl19.20gmR4LK-FVR8wh1Qvwu5Oy-ABTWby_hGSrBX6xjzZk',
    );
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
