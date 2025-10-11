// cielo-sales.service.ts
import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { promises as fs, readFileSync } from 'fs';
export interface SimplifiedSale {
  dataVenda: string;
  timeVenda: string;
  // dataCaptura: string;
  // dataLancamento: string;
  valorBruto: number;
  valorLiquido: number;
  taxaAdministrativa: number;
  modalidade: string;
  bandeira: string;
  estabelecimento: string;
  nsu: string;
  codigoAutorizacao: string;
  codigoTransacao: string;
}

export interface SalesSummary {
  totalVendas: number;
  valorTotalBruto: number;
  valorTotalLiquido: number;
  vendas: SimplifiedSale[];
}

@Injectable()
export class CieloTransformSalesService {
  // async parseSalesData(fileNames: string[]) {
  async parseSalesData(fileNames: File[]) {
    const vendas: SimplifiedSale[] = [];

    for (const fileName of fileNames) {
      const isFileSale = fileName.name.substring(0, 8);
      // const isFileSale = fileName.substring(0, 8);
      if (isFileSale !== 'CIELO03D') {
        continue;
      }
      const filePath = readFileSync(
        `C:\\Users\\Liderança\\Desktop\\gerenciamento-cofre\\api\\extractFiles\\${fileName.name}`,
        'utf8',
      );
      try {
        const lines = filePath.trim().split('\n');

        for (const line of lines) {
          const recordType = line.charAt(0);
          if (recordType === 'E') {
            const venda = this.parseSaleRecord(line);
            if (venda) {
              vendas.push(venda);
            }
          }
        }
      } catch (err) {
        console.error(`Erro ao ler/parsing do arquivo ${fileName}:`, err);
      }
    }

    return vendas;
  }

  private parseSaleRecord(line: string): SimplifiedSale | null {
    try {
      // Extrair apenas campos essenciais
      const tipoLancamento = this.extractField(line, 28, 29);

      // Filtrar apenas vendas (tipos 01, 02, 03, 42)
      if (!['01', '02', '03', '42'].includes(tipoLancamento)) {
        return null;
      }

      const valorBruto = this.parseCurrency(this.extractField(line, 262, 274));
      const valorLiquido = this.parseCurrency(
        this.extractField(line, 276, 288),
      );
      const taxaAdministrativa = this.parseCurrency(
        this.extractField(line, 242, 246),
      );
      const dataVenda = this.formatDate(this.extractField(line, 566, 573)); // DDMMAAAA
      const horaVenda = this.extractField(line, 471, 476); // HHMMSS

      return {
        dataVenda: dataVenda,
        timeVenda: horaVenda, // Data autorização DDMMAAAA
        // dataCaptura: this.formatDate(this.extractField(line, 574, 581)),
        // dataLancamento: this.formatDate(this.extractField(line, 582, 589)),
        valorBruto: valorBruto,
        valorLiquido: valorLiquido,
        taxaAdministrativa: taxaAdministrativa,
        modalidade: this.getModalidade(tipoLancamento),
        bandeira: this.getBandeira(this.extractField(line, 12, 14)),
        estabelecimento: this.extractField(line, 2, 11),
        nsu: this.extractField(line, 176, 181),
        codigoAutorizacao: this.extractField(line, 22, 27),
        codigoTransacao: this.extractField(line, 130, 151),
      };
    } catch (error) {
      console.error('Erro ao parsear registro de venda:', error);
      return null;
    }
  }

  private parseCurrency(value: string): number {
    if (!value || value.trim() === '') return 0;

    // Valores no arquivo estão em centavos (sem vírgulas/pontos)
    // Exemplo: "0000000010000" = R$ 10,00
    const numericValue = parseInt(value, 10) || 0;
    return numericValue / 100; // Converter para reais
  }

  private formatDate(dateStr: string): string {
    if (!dateStr || dateStr.length !== 8) return dateStr;

    // Converter de DDMMAAAA para AAAA-MM-DD
    const day = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const year = dateStr.substring(4, 8);

    return `${year}-${month}-${day}`;
  }

  private getModalidade(tipoLancamento: string): string {
    const modalidades = {
      '01': 'Débito',
      '02': 'Crédito à Vista',
      '03': 'Crédito Parcelado',
      '42': 'Voucher',
    };

    return modalidades[tipoLancamento] || 'Desconhecida';
  }

  private getBandeira(codigoBandeira: string): string {
    const bandeiras = {
      '001': 'Visa',
      '002': 'Mastercard',
      '003': 'American Express',
      '006': 'Sorocred',
      '007': 'Elo',
      '009': 'Diners',
      '011': 'Agiplan',
      '015': 'Banescard',
      '023': 'Cabal',
      '029': 'Credsystem',
      '035': 'Esplanada',
      '040': 'Hipercard',
      '060': 'JCB',
      '064': 'Credz',
      '072': 'Hiper',
      '075': 'Ourocard',
      '888': 'Pix',
    };

    return bandeiras[codigoBandeira] || `Bandeira ${codigoBandeira}`;
  }

  private extractField(line: string, start: number, end: number): string {
    const startIndex = start - 1;
    const endIndex = end;

    if (line.length >= endIndex) {
      return line.substring(startIndex, endIndex).trim();
    }
    return '';
  }

  // Método para filtrar vendas por data
  // filterSalesByDate(
  //   sales: SimplifiedSale[],
  //   dataInicio: string,
  //   dataFim: string,
  // ): SimplifiedSale[] {
  //   return sales.filter((venda) => {
  //     const dataVenda = venda.dataVenda;
  //     return dataVenda >= dataInicio && dataVenda <= dataFim;
  //   });
  // }

  // Método para agrupar vendas por modalidade
  groupByModalidade(sales: SimplifiedSale[]): Record<string, SimplifiedSale[]> {
    return sales.reduce((acc, venda) => {
      if (!acc[venda.modalidade]) {
        acc[venda.modalidade] = [];
      }
      acc[venda.modalidade].push(venda);
      return acc;
    }, {});
  }

  // Método para obter resumo financeiro
  getFinancialSummary(sales: SimplifiedSale[]) {
    const totalBruto = sales.reduce((sum, venda) => sum + venda.valorBruto, 0);
    const totalLiquido = sales.reduce(
      (sum, venda) => sum + venda.valorLiquido,
      0,
    );
    const totalTaxas = sales.reduce(
      (sum, venda) => sum + venda.taxaAdministrativa,
      0,
    );

    return {
      totalVendas: sales.length,
      valorTotalBruto: totalBruto,
      valorTotalLiquido: totalLiquido,
      valorTotalTaxas: totalTaxas,
      ticketMedio: sales.length > 0 ? totalBruto / sales.length : 0,
    };
  }
}
