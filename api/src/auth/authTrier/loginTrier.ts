import { chromium } from 'playwright';
export interface authData {
  login: string;
  password: string;
}
export async function authTrier(authData: authData, urlTrier?: string) {
  if (!urlTrier) urlTrier = 'farmargrande2.dyndns.org';
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

    await page.goto(`http://${urlTrier}:4647/sgfpod1/Login.pod`, {
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
    throw new Error(error);
  } finally {
    await browser?.close();
  }
}
