import { Inject, Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from 'src/database/prisma.service';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

export interface SimplifiedParc {
  idempotencyKey: string;
  dataVenda: Date;
  dataVencimento: Date;
  parcela: number;
  totalParcelas: number;
  valor: number;
  valorLiquido: number;
  taxaAdministrativa: number;
  modalidade: string;
  bandeira: string;
  filialId: number;
  estabelecimento: string;
  nsu: string;
  codigoAutorizacao: string;
  codigoTransacao: string;
  vendaId?: number;
}

@Injectable()
export class CieloParcTransform {
  @Inject()
  private readonly Prisma: PrismaService;

  private readonly logger = new Logger(CieloParcTransform.name);
  private extractDate(fileName: string) {
    const parts = fileName.replace('.TXT', '').split('_');

    const date = parts[2];

    return `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
  }
  async execute(fileNames: string[], context?: JobExecutionContext) {
    const parcelas: SimplifiedParc[] = [];
    const filiais = await this.Prisma.filial.findMany({
      select: {
        id: true,
        idCielo: true,
      },
    });

    const filialMap = new Map(filiais.map((f) => [f.idCielo, f.id]));

    for (const fileName of fileNames) {
      const isFileSale = fileName.substring(0, 8);
      // const isFileSale = fileName.substring(0, 8);

      const filePath = readFileSync(
        join(process.env.PATH_LOCAL_UPLOADS!, fileName),
        'utf8',
      );

      try {
        const lines = filePath.trim().split('\n');

        for (const line of lines) {
          const recordType = line.charAt(0);
          if (recordType === 'E' && isFileSale === 'CIELO03D') {
            const venda = this.parseSaleRecord(line, filialMap);
            if (venda) {
              parcelas.push(venda);
            }
          }
          if (recordType === '8' && isFileSale === 'CIELO16D') {
            const venda = this.parsePixRecord(line, filialMap);
            if (venda) {
              parcelas.push(venda);
            }
          }
        }
        if (context) {
          const date = this.extractDate(fileName);
          await context.updateDateProgress('CieloParc', date);
        }
      } catch (err) {
        this.logger.error(`Erro ao ler/parsing do arquivo ${fileName}:`, err);
        throw err;
      }
    }

    this.logger.log('TRANSFORM ✅');
    return parcelas;
  }

  private parsePixRecord(
    line: string,
    filialMap: Map<string, number>,
  ): SimplifiedParc | null {
    try {
      const valor = this.parseCurrency(this.extractField(line, 75, 87));
      const valorLiquido = this.parseCurrency(
        this.extractField(line, 103, 115),
      );
      const dataVenda = this.formatDate(this.extractField(line, 14, 19));
      const dataVencimento = this.formatDate(this.extractField(line, 68, 73));

      const codigoTransacao = this.extractField(line, 26, 61);
      const estabelecimento = this.extractField(line, 2, 11);
      const taxaAdministrativa = this.parseCurrency(
        this.extractField(line, 89, 101),
      );

      const filialId = filialMap.get(estabelecimento);

      return {
        idempotencyKey: `|${codigoTransacao}|${dataVenda}|${filialId}|${1}`,
        dataVenda: new Date(dataVenda),
        estabelecimento,
        dataVencimento: new Date(dataVencimento),
        parcela: 1,
        totalParcelas: 1,
        valor,
        valorLiquido,
        taxaAdministrativa: taxaAdministrativa,
        modalidade: 'Pix',
        bandeira: 'Pix',
        filialId,
        nsu: '',
        codigoAutorizacao: '',
        codigoTransacao,
      };
    } catch (error) {
      this.logger.error('Erro ao parsear registro PIX:', error);
      return null;
    }
  }
  private parseSaleRecord(
    line: string,
    filialMap: Map<string, number>,
  ): SimplifiedParc | null {
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
      const dataVencimento = this.formatDate(this.extractField(line, 630, 637));
      const estabelecimento = this.extractField(line, 2, 11);
      const codigoTransacao = this.extractField(line, 130, 151);
      const parcela =
        Number(this.extractField(line, 18, 19)) === 0
          ? 1
          : Number(this.extractField(line, 18, 19));
      const filialId = filialMap.get(estabelecimento);
      return {
        idempotencyKey: `|${codigoTransacao}|${dataVenda}|${filialId}|${parcela}`,
        dataVenda: new Date(dataVenda),
        estabelecimento,
        dataVencimento: new Date(dataVencimento),
        parcela,
        totalParcelas:
          Number(this.extractField(line, 20, 21)) === 0
            ? 1
            : Number(this.extractField(line, 20, 21)),
        valor: valorBruto,
        valorLiquido: valorLiquido,
        taxaAdministrativa: taxaAdministrativa,
        modalidade: this.getModalidade(tipoLancamento),
        bandeira: this.getBandeira(this.extractField(line, 12, 14)),
        filialId,
        nsu: this.extractField(line, 176, 181),
        codigoAutorizacao: this.extractField(line, 22, 27),
        codigoTransacao,
      };
    } catch (error) {
      this.logger.error('Erro ao parsear registro de venda:', error);
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
    if (!dateStr) return dateStr;
    // Converter de DDMMAAAA para AAAA-MM-DD
    if (dateStr.length === 8) {
      const day = dateStr.substring(0, 2);
      const month = dateStr.substring(2, 4);
      const year = dateStr.substring(4, 8);

      return `${year}-${month}-${day}`;
    }
    // Converter de AAMMDD para AAAA-MM-DD
    if (dateStr.length === 6) {
      const day = dateStr.substring(4, 6);
      const month = dateStr.substring(2, 4);
      const year = dateStr.substring(0, 2);

      return `20${year}-${month}-${day}`;
    }
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
}
