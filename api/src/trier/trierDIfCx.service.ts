import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { chromium } from 'playwright';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class TrierDifCxETL implements OnModuleInit {
  @Inject()
  private readonly prisma: PrismaService;

  private convertFiliaisId = {
    1: 'MATRIZ',
    2: 'TAIRU',
    3: 'ULTRA',
    4: 'VASCO',
    5: 'BOMDESPACHO',
    6: 'LIDERANCA',
    7: 'COROA',
  };

  private toMySQLDate(dateBR: string) {
    const [d, m, y] = dateBR.split('/');
    return `${y}-${m}-${d}`;
  }

  async onModuleInit() {
    await this.macro(1, 'MATRIZ');
    await this.macro(2, 'TAIRU');
    await this.macro(3, 'ULTRA');
    await this.macro(4, 'VASCO');
    await this.macro(5, 'BOMDESPACHO');
    await this.macro(6, 'LIDERANCA');
    await this.macro(7, 'COROA');
  }

  async macro(idFilial: number, pathFilial: string) {
    let ultimoItem = 0;
    const caixas: any[] = [];
    const filial = this.convertFiliaisId[idFilial];

    const ultimo = await this.prisma.excel_staging_diferenca_caixa.findFirst({
      where: { filial },
      orderBy: { caixa: 'desc' },
      select: { caixa: true },
    });

    ultimoItem = ultimo ? Number(ultimo.caixa) + 1 : 0;
    console.log(ultimoItem);

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.route('**/*', (route, request) => {
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('http://192.168.1.253:4647/sgfpod1/Login.pod', {
      waitUntil: 'domcontentloaded',
    });

    await page.fill('#id_cod_usuario', '95');
    await page.fill('#nom_senha', 'cadu3011');
    await page.click('#login');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    await page.goto(
      'http://192.168.1.253:4647/sgfpod1/Rel_0031.pod?cacheId=1731938666758',
      { waitUntil: 'domcontentloaded' },
    );

    for (let i = 0; i < 2; ) {
      await page.fill('#id_cod_filialEntrada', `${idFilial}`);
      await page.keyboard.press('Enter', { delay: 50 });

      await page.fill('#num_caixaEntrada', ultimoItem.toString());
      await page.keyboard.press('Enter');

      await page.waitForTimeout(750);

      const dataValue = await page.$eval(
        '#dat_abertura',
        (el: any) => el.value,
      );

      const nomeValue = await page.$eval(
        '#cadusuar_operador_nom_usuario',
        (el: any) => el.value,
      );

      await page.waitForSelector('#saida3');
      await page.click('#saida3');

      const context = browser.contexts()[0];

      try {
        const [newPage] = await Promise.all([
          context.waitForEvent('page', { timeout: 25000 }),
          page.click('#runReport'),
        ]);

        await newPage.waitForSelector(
          'body > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(51) > td:nth-child(4) > span',
          { timeout: 10000 },
        );

        const valueText = await newPage.$eval(
          'body > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(51) > td:nth-child(4) > span',
          (el: any) => el.innerText,
        );

        const novoUltimoItem = ultimoItem.toString();

        if (
          caixas.length > 0 &&
          caixas[caixas.length - 1].caixa === novoUltimoItem
        ) {
          throw new Error('Erro: ultimoItem igual ao último item lançado');
        }
        if (
          this.toMySQLDate(dataValue) ===
          this.toMySQLDate(new Date().toLocaleDateString())
        )
          throw new Error(
            'Erro: Data igual a data de hoje já lançada .FINALIZADO',
          );

        const dif = Number(valueText.replace(/\./g, '').replace(',', '.'));
        caixas.push({
          dia: new Date(this.toMySQLDate(dataValue)),
          caixa: novoUltimoItem,
          operador: nomeValue.split(' ')[0],
          valor: dif,
          filial,
          sobra: dif > 0 ? 0 : dif * -1,
          falta: dif < 0 ? 0 : dif,
        });

        ultimoItem++;
        await newPage.close();
      } catch (error) {
        console.log(
          `Erro: nova aba da Filial ${pathFilial} não abriu. Gravando dados.`,
          error,
        );

        if (caixas.length) {
          await this.prisma.excel_staging_diferenca_caixa.createMany({
            data: caixas,
            skipDuplicates: true,
          });
        }

        await browser.close();
        return;
      }
    }

    await browser.close();
  }
}
