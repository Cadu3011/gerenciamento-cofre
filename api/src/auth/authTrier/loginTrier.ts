// import { chromium } from 'playwright';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
// import qs from 'qs';
export interface authData {
  login: string;
  password: string;
}
export async function authTrier(
  authData: authData,
  urlTrier?: string,
  idFilial?: number,
) {
  if (!urlTrier) {
    urlTrier = '192.168.1.253';
  }
  if (!idFilial) {
    idFilial = 99;
  }
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
    }),
  );

  const baseURL = `http://${urlTrier}:4647/sgfpod1`;

  const headers = {
    'User-Agent': 'Mozilla/5.0',
    Origin: `http://${urlTrier}:4647`,
    Referer: `${baseURL}/Login.pod`,
    'X-Requested-With': 'XMLHttpRequest',
  };

  // 1️⃣ GET Login
  const loginPage = await client.get(`${baseURL}/Login.pod`, {
    headers,
  });

  const html = loginPage.data;

  const controller = html.match(/controllerSerial\s*=\s*'([^']+)'/)?.[1];

  if (!controller) {
    throw new Error('Não encontrou controller');
  }

  // gera actionId igual o framework deles
  const actionId = `${Date.now()}_1`;

  // 2️⃣ POST httpStart
  const bodyHttpStart =
    `actionId=${actionId}` +
    `&controller=${controller}` +
    `&action=httpStart` +
    `&attributes=id_cod_rede%3Dty-text!id-id_cod_rede!ds-0!ro-0!fi-0!` +
    `%26id_cod_filial%3Dty-text!id-id_cod_filial!ds-0!ro-0!fi-0!` +
    `%26nom_filial%3Dty-text!id-nom_filial!ds-1!ro-0!fi-0!` +
    `%26id_cod_usuario%3Dty-text!id-id_cod_usuario!ds-0!ro-0!fi-0!` +
    `%26nom_senha%3Dty-password!id-nom_senha!ds-0!ro-0!fi-0!` +
    `%26login%3Dty-button!id-login!ds-0!ro-0!fi-0!` +
    `%26limpar%3Dty-button!id-limpar!ds-0!ro-0!fi-0!`;

  const responseStart = await client.post(
    `${baseURL}/PodiumAction?actionId=${actionId}`,
    bodyHttpStart,
    {
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  const newActionId =
    responseStart.data.match(/actionId=(\d+_\d+)/)?.[1] || actionId;

  // 3️⃣ POST login (save)
  const bodyLogin =
    `actionId=${newActionId}` +
    `&controller=${controller}` +
    `&action=save` +
    `&id_cod_rede=1` +
    `&id_cod_filial=${idFilial}` +
    `&nom_filial=FILIAL%2099%20-%20CENTRAL%20CAVALCANTE` +
    `&id_cod_usuario=${authData.login}` +
    `&nom_senha=${authData.password}`;

  const loginResponse = await client.post(
    `${baseURL}/PodiumAction?actionId=${newActionId}`,
    bodyLogin,
    {
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  const js = loginResponse.data;

  // Extrai token_integracao do localStorage.setItem
  const tokenMatch = js.match(
    /localStorage\.setItem\('token_integracao','([^']+)'/,
  );

  if (!tokenMatch) {
    console.log('Não encontrou token_integracao');
    return '';
  }

  const token = tokenMatch[1];
  return token;
}

// let browser;
// const browser = await chromium.launch({
//   headless: true,
//   args: ['--no-sandbox', '--disable-setuid-sandbox'],
// });

// const context = await browser.newContext();
// const page = await context.newPage();

// await page.route('**/*', (route, request) => {
//   if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
//     route.abort();
//   } else {
//     route.continue();
//   }
// });

// await page.goto(`http://${urlTrier}:4647/sgfpod1/Login.pod`, {
//   waitUntil: 'domcontentloaded',
//   timeout: 10000,
// });
// await page.fill('#id_cod_usuario', authData.login);
// await page.fill('#nom_senha', authData.password);
// await page.click('#login');

// await page.waitForSelector('#popoverNews', { timeout: 3000 });
// const token = await page.evaluate(() => {
//   return localStorage.getItem('token_integracao');
// });

// return token;
// finally {
//     await browser?.close();
//  }
