import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UpdateCieloDto } from './dto/update-cielo.dto';
import * as Client from 'ssh2-sftp-client';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { CieloTransformSalesService } from './cielo-extratc-vendas.service';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from '@prisma/client';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CieloService implements OnModuleInit {
  private sftp = new (Client as any)();
  private readonly logger = new Logger(CieloService.name);
  @Inject(CieloTransformSalesService)
  private readonly cieloTransformSalesService: CieloTransformSalesService;

  @Inject()
  private readonly Prisma: PrismaService;

  private readonly config = {
    host: '152.70.222.12',
    port: 22,
    username: 'ubuntu',
    privateKey: fs.readFileSync(
      path.resolve(__dirname, '../../sftpKey/ssh-key-2025-09-12.key'),
    ),
  };
  async onModuleInit() {
    const fileList = await this.uploadExtract(
      '/home/cielo-sftp/uploads',
      'C:\\Users\\Liderança\\Desktop\\gerenciamento-cofre\\api\\extractFiles',
    );
    await this.deleteRemoteFiles('/home/cielo-sftp/uploads');

    // const fileContent: string[] = listarArquivosSync(
    //   'C:\\Users\\Liderança\\Desktop\\gerenciamento-cofre\\api\\src\\cielo\\extractFiles',
    // );

    function listarArquivosSync(pasta) {
      try {
        const arquivos = fs.readdirSync(pasta);
        const listaArquivos = [];

        for (const arquivo of arquivos) {
          const caminhoCompleto = path.posix.join(pasta, arquivo);
          const stats = fs.statSync(caminhoCompleto);

          if (stats.isFile()) {
            listaArquivos.push(arquivo);
          }
        }

        return listaArquivos;
      } catch (error) {
        console.error('Erro ao ler pasta:', error);
        return [];
      }
    }
    if (fileList.length === 0) {
      return;
    }
    const vendas: Prisma.CartaoVendasCreateInput[] =
      await this.cieloTransformSalesService.parseSalesData(fileList);
    await this.create(vendas);
  }

  @Cron('29 7,8,9 * * 1-7')
  async pipelineETL() {
    const fileList = await this.uploadExtract(
      '/home/cielo-sftp/uploads',
      'C:\\Users\\Liderança\\Desktop\\gerenciamento-cofre\\api\\extractFiles',
    );
    await this.deleteRemoteFiles('/home/cielo-sftp/uploads');
    if (fileList.length === 0) {
      return;
    }
    const vendas: Prisma.CartaoVendasCreateInput[] =
      await this.cieloTransformSalesService.parseSalesData(fileList);
    await this.create(vendas);
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
    return new Promise<void>((resolve, reject) => {
      // Comando SSH remoto para deletar todos os arquivos da pasta
      const cmd = `ssh -i C:\\Users\\Liderança\\Downloads\\ssh-key-2025-09-12.key ubuntu@152.70.222.12 "sudo rm -f ${remoteDir}/*"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          this.logger.error('❌ Erro ao deletar arquivos via SSH', error);
          return reject(error);
        }
        if (stderr) this.logger.warn('⚠️ SSH stderr: ' + stderr);

        this.logger.log('🗑️ Arquivos deletados com sucesso via SSH');
        resolve();
      });
    });
  }
  create(data: Prisma.CartaoVendasCreateInput[]) {
    return this.Prisma.cartaoVendas.createMany({ data: data });
  }

  findAll() {
    return `This action returns all cielo`;
  }

  findOne(id: number) {
    return `This action returns a #${id} cielo`;
  }

  update(id: number, updateCieloDto: UpdateCieloDto) {
    return `This action updates a #${id} cielo`;
  }

  remove(id: number) {
    return `This action removes a #${id} cielo`;
  }
}
