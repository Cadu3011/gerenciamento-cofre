// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Client from 'ssh2-sftp-client';
import * as fs from 'fs';
import * as path from 'path';
import { CieloTransformSalesService } from './cielo-extratc-vendas.service';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { FilialService } from 'src/filial/filial.service';

@Injectable()
export class CieloService {
  private sftp = new (Client as any)();
  private readonly logger = new Logger(CieloService.name);
  @Inject(CieloTransformSalesService)
  private readonly cieloTransformSalesService: CieloTransformSalesService;

  @Inject()
  private readonly filial: FilialService;

  @Inject()
  private readonly Prisma: PrismaService;

  private readonly config = {
    host: '152.70.222.12',
    port: 22,
    username: 'ubuntu',
    privateKey: fs.readFileSync(
      path.resolve(__dirname, process.env.PATH_SFTP_KEY),
    ),
  };

  @Cron('18 7,8,9,10 * * 1-7')
  async pipelineETL() {
    try {
      const fileList = await this.uploadExtract(
        process.env.PATH_VM_CIELO_UPLOADS,
        process.env.PATH_LOCAL_UPLOADS,
      );

      if (fileList.length === 0) {
        this.logger.log('Nenhum arquivo encontrado. Processo encerrado.');
        return;
      }

      const vendas: Prisma.CartaoVendasCreateInput[] =
        await this.cieloTransformSalesService.parseSalesData(fileList);

      await this.create(vendas);

      this.logger.log('✅ Vendas processadas e salvas com sucesso.');

      await this.deleteRemoteFiles(process.env.PATH_VM_CIELO_UPLOADS);
    } catch (error) {
      this.logger.error('❌ Erro durante o pipeline ETL:', error);
    }
  }

  async uploadExtract(remoteSourceDir: string, localDir: string) {
    try {
      await this.sftp.connect(this.config);
      this.logger.log('✅ Conectado ao servidor SFTP via chave SSH');

      const fileList = await this.sftp.list(remoteSourceDir);
      this.logger.log(
        `📦 ${fileList.length} arquivos encontrados em ${remoteSourceDir}`,
      );

      if (!fs.existsSync(localDir)) {
        console.log('path não encontrado');
        fs.mkdirSync(localDir, { recursive: true });
      }
      for (const file of fileList) {
        const remotePath = path.posix.join(remoteSourceDir, file.name);
        const localPath = path.posix.join(localDir, file.name);

        await this.sftp.fastGet(remotePath, localPath);
        this.logger.log(`⬇️  Baixado: ${file.name}`);
      }
      return fileList;
    } catch (error) {
      this.logger.error('❌ Erro ao mover arquivos via SFTP', error);
      throw error;
    } finally {
      await this.sftp.end();
      this.logger.log('🔌 Conexão encerrada');
    }
  }
  async deleteRemoteFiles(remoteDir: string) {
    // return new Promise<void>((resolve, reject) => {
    //   // Comando SSH remoto para deletar todos os arquivos da pasta
    //   const cmd = `ssh -i C:\\Users\\Liderança\\Downloads\\ssh-key-2025-09-12.key ubuntu@152.70.222.12 "sudo rm -f ${remoteDir}/*"`;

    //   exec(cmd, (error, stdout, stderr) => {
    //     if (error) {
    //       this.logger.error('❌ Erro ao deletar arquivos via SSH', error);
    //       return reject(error);
    //     }
    //     if (stderr) this.logger.warn('⚠️ SSH stderr: ' + stderr);

    //     this.logger.log('🗑️ Arquivos deletados com sucesso via SSH');
    //     resolve();
    //   });
    // });
    try {
      await this.sftp.connect(this.config);
      const files = await this.sftp.list(remoteDir);
      for (const file of files) {
        await this.sftp.delete(path.posix.join(remoteDir, file.name));
        this.logger.log(`🗑️ Deletado: ${file.name}`);
      }
    } catch (error) {
      this.logger.error('❌ Erro ao deletar arquivos via SFTP', error);
    } finally {
      await this.sftp.end();
      this.logger.log('🔌 Conexão encerrada após deleção.');
    }
  }
  create(data: Prisma.CartaoVendasCreateInput[]) {
    return this.Prisma.cartaoVendas.createMany({ data: data });
  }

  async findSalesDetails(filialId: number, date: string) {
    const estCielo = await this.filial.findOne(filialId);
    const vendas = await this.Prisma.cartaoVendas.groupBy({
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
        estabelecimento: String(estCielo.idCielo),
        dataVenda: date,
      },
      _sum: {
        valorBruto: true,
        valorLiquido: true,
      },
    });
    return vendas;
  }
  async findSalesTotals(filialId: number, startDate: string, endDate: string) {
    const estCielo = await this.filial.findOne(filialId);
    const vendas = await this.Prisma.cartaoVendas.groupBy({
      by: ['dataVenda', 'estabelecimento'],
      where: {
        estabelecimento: String(estCielo.idCielo),
        dataVenda: { gte: startDate, lte: endDate },
      },
      _sum: {
        valorBruto: true,
        valorLiquido: true,
        taxaAdministrativa: true,
      },
    });
    return vendas;
  }

  findOne(id: number) {
    return `This action returns a #${id} cielo`;
  }

  remove(id: number) {
    return `This action removes a #${id} cielo`;
  }
}
