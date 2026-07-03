import { Inject, Injectable, Logger } from '@nestjs/common';
import { readdir } from 'fs/promises';

import { CieloParcETLPipeline } from '../pipeline/cielo.pipeline';

@Injectable()
export class CieloParcETLCron {
  @Inject()
  private readonly parcela: CieloParcETLPipeline;

  private readonly logger = new Logger(CieloParcETLCron.name);

  async execute() {
    try {
      const uploadsPath = process.env.PATH_LOCAL_UPLOADS;

      if (!uploadsPath) {
        throw new Error('PATH_LOCAL_UPLOADS não foi definido.');
      }

      const today = new Date();

      const todayString =
        `${today.getFullYear()}` +
        `${String(today.getMonth() + 1).padStart(2, '0')}` +
        `${String(today.getDate()).padStart(2, '0')}`;

      const files = await readdir(uploadsPath);

      const fileList = files.filter(
        (file) =>
          file.toUpperCase().endsWith('.TXT') &&
          file.includes(`_${todayString}_`),
      );

      if (fileList.length === 0) {
        this.logger.error(`Nenhum arquivo da data ${todayString} encontrado.`);
        throw new Error(`Nenhum arquivo da data ${todayString} encontrado.`);
      }

      await this.parcela.execute(fileList);

      this.logger.log(
        `✅ ${fileList.length} arquivo(s) processado(s) com sucesso.`,
      );
    } catch (error) {
      this.logger.error(
        'Erro ao processar arquivos da Cielo.',
        error instanceof Error ? error.stack : String(error),
      );

      throw error; // opcional: relança o erro para quem chamou o cron
    }
  }
}
