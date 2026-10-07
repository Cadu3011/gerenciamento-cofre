import { Inject, Injectable, Logger } from '@nestjs/common';
import { readdir } from 'fs/promises';

import { CieloParcETLPipeline } from '../pipeline/cielo.pipeline';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';
import { RunJobQueryDto } from 'src/jobs/dto/runCronJob.dto';

@Injectable()
export class CieloParcETLCron {
  @Inject()
  private readonly pipeline: CieloParcETLPipeline;

  private readonly logger = new Logger(CieloParcETLCron.name);

  /**
   * Data do arquivo em ISO (AAAA-MM-DD).
   *
   * O nome do arquivo é `PREFIXO_ESTABELECIMENTO_AAAAMMDD_...`, com a data
   * sempre no terceiro trecho separado por `_`. Devolve null em vez de estourar
   * quando o nome está fora do padrão: o bigCharge varre a pasta inteira, e
   * qualquer .TXT fora da convenção derrubaria o job inteiro.
   */
  private extractDate(fileName: string): string | null {
    const parts = fileName.replace('.TXT', '').split('_');
    const date = parts[2];

    if (!date || !/^\d{8}/.test(date)) {
      return null;
    }

    return `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
  }

  /**
   * Data local no formato ISO.
   *
   * Não usar toISOString() aqui: o processo roda em UTC-3, então entre 21h e
   * meia-noite a data UTC já virou o dia seguinte e o AUTO procuraria o
   * arquivo de amanhã. O nome do arquivo traz a data do dia de negócio da
   * Cielo, que é a data local.
   */
  private toISODate(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Período de arquivos a processar, no mesmo formato do Trier e da Rede.
   *
   * A diferença para os outros dois é que aqui o período não vem do banco: ele
   * recorta os arquivos disponíveis na pasta de uploads.
   */
  private resolvePeriod(options: RunJobQueryDto): {
    start: string;
    end: string;
  } {
    // =========================================================
    // DATE
    // =========================================================

    if (options.period === 'DATE') {
      return {
        start: options.retryStartDate ?? options.date,
        end: options.date,
      };
    }

    // =========================================================
    // RANGE
    // =========================================================

    if (options.period === 'RANGE') {
      return {
        start: options.retryStartDate ?? options.startDate,
        end: options.endDate,
      };
    }

    // =========================================================
    // AUTO
    // =========================================================
    //
    // A Cielo entrega um arquivo por dia e o job dispara várias vezes ao dia,
    // então AUTO segue sendo "os arquivos de hoje" — o comportamento de antes.
    // Reprocessar um dia que ficou para trás é o que DATE e RANGE servem: AUTO
    // não pode varrer a pasta inteira a cada disparo, que é o que o bigCharge
    // faz e o que a idempotência do load não torna barato.

    const today = this.toISODate(new Date());

    return { start: today, end: today };
  }

  async execute(context: JobExecutionContext, options: RunJobQueryDto = {}) {
    try {
      const uploadsPath = process.env.PATH_LOCAL_UPLOADS;

      if (!uploadsPath) {
        throw new Error('PATH_LOCAL_UPLOADS não foi definido.');
      }

      const { start, end } = this.resolvePeriod(options);

      const files = await readdir(uploadsPath);

      const txtFiles = files.filter((file) =>
        file.toUpperCase().endsWith('.TXT'),
      );

      // Data de cada arquivo, calculada uma vez. bigCharge ignora o período e
      // processa tudo que estiver na pasta, inclusive arquivos sem data
      // reconhecível — o erro, se houver, é do transform ao parsear.
      const dateByFile = new Map(
        txtFiles.map((file) => [file, this.extractDate(file)]),
      );

      const fileList = options.bigCharge
        ? txtFiles
        : txtFiles.filter((file) => {
            const fileDate = dateByFile.get(file);
            return fileDate !== null && fileDate >= start && fileDate <= end;
          });

      if (fileList.length === 0) {
        const disponiveis = [
          ...new Set(
            txtFiles
              .map((file) => dateByFile.get(file))
              .filter((d): d is string => d !== null),
          ),
        ].sort();

        const where = disponiveis.length
          ? `Datas disponíveis na pasta: ${disponiveis.join(', ')}.`
          : `A pasta ${uploadsPath} não tem arquivos .TXT com data reconhecível.`;

        throw new Error(
          `Nenhum arquivo da Cielo entre ${start} e ${end}. ${where}`,
        );
      }

      fileList.sort((a, b) =>
        (dateByFile.get(a) ?? '').localeCompare(dateByFile.get(b) ?? ''),
      );

      const startDate = dateByFile.get(fileList[0]) ?? start;
      const endDate = dateByFile.get(fileList[fileList.length - 1]) ?? end;

      await context.startDateProgress('CieloParc', startDate, endDate);
      context.info('PIPELINE', 'Pipeline iniciada');
      await this.pipeline.execute(fileList, context);

      this.logger.log(
        `✅ ${fileList.length} arquivo(s) processado(s) com sucesso.`,
      );
    } catch (error) {
      this.logger.error(
        'Erro ao processar arquivos da Cielo.',
        error instanceof Error ? error.stack : String(error),
      );
      context.error('CRON', error.message);
      throw error; // opcional: relança o erro para quem chamou o cron
    }
  }
}
