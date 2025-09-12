import { chromium } from 'playwright';
export interface authData {
  login: string;
  password: string;
}
export async function authTrier(authData: authData) {
  let browser;
  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.route('**/*', (route, request) => {
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('http://192.168.1.253:4647/sgfpod1/Login.pod', {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });
    await page.fill('#id_cod_usuario', authData.login);
    await page.fill('#nom_senha', authData.password);
    await page.click('#login');

    await page.waitForSelector('#popoverNews', { timeout: 3000 });
    const token = await page.evaluate(() => {
      return localStorage.getItem('token_integracao');
    });

    return token;
  } catch (error) {
    console.log(error);
    return error;
  } finally {
    await browser?.close();
  }
}
