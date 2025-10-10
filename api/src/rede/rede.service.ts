import { Inject, Injectable } from '@nestjs/common';
import { UpdateRedeDto } from './dto/update-rede.dto';
import { FilialService } from 'src/filial/filial.service';

@Injectable()
export class RedeService {
  private clientId = 'a6983c30-1f69-4aaa-927d-d6a65e21a443';
  private clientSecret = '98iW4yT1Jk';
  private token = null;
  private tokenExpiresAt: number = 0;
  @Inject()
  private readonly filial: FilialService;

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && now < this.tokenExpiresAt) {
      // Token ainda válido
      return this.token;
    }

    // Solicita novo token
    const data = await this.auth();
    this.token = data.access_token;
    this.tokenExpiresAt = now + (data.expires_in - 1) * 60 * 1000;
    return this.token;
  }
  async auth() {
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');
    myHeaders.append('Authorization', `Basic ${credentials}`);

    const urlencoded = new URLSearchParams();
    urlencoded.append('grant_type', 'client_credentials');

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: urlencoded,
      redirect: 'follow',
    };

    const res = await fetch(
      'https://api.userede.com.br/redelabs/oauth2/token',
      requestOptions,
    );
    const data = await res.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  }
  async findSalesDetails(idRede: number, date: string) {
    const token = await this.getAccessToken();
    const estRede = await this.filial.findOne(idRede);
    const res = await fetch(
      `https://api.userede.com.br/redelabs/merchant-statement/v1/sales?parentCompanyNumber=${estRede.idRede}&subsidiaries=${estRede.idRede}&startDate=${date}&endDate=${date}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const vendas = await res.json();
    return vendas.content.transactions;
  }

  async findSalesTotals(idRede: number, startDate: string, endDate: string) {
    const token = await this.getAccessToken();
    const estRede = await this.filial.findOne(idRede);
    const res = await fetch(
      `https://api.userede.com.br/redelabs/merchant-statement/v2/sales/${estRede.idRede}/summary?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const vendas = await res.json();
    return vendas.content.sales;
  }

  update(id: number, updateRedeDto: UpdateRedeDto) {
    return `This action updates a #${id} rede`;
  }

  remove(id: number) {
    return `This action removes a #${id} rede`;
  }
}
