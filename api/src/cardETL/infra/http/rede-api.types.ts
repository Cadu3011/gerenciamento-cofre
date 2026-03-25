import { Decimal } from '@prisma/client/runtime/library';

export type RedeCardsExtracted = {
  nsu: string;
  status: string;
  amount: Decimal;
  netAmount: Decimal;
  modality: { type: string };
  brandCode: number;
  saleDate: string;
  saleHour: string;
  merchant: { companyNumber: number };
};

export const cardBrands = [
  { brandCode: 1, brand: 'Mastercard' },
  { brandCode: 2, brand: 'Visa' },
  { brandCode: 3, brand: 'Diners' },
  { brandCode: 4, brand: 'Cabal' },
  { brandCode: 5, brand: 'Sicred' },
  { brandCode: 6, brand: 'Sorocred' },
  { brandCode: 7, brand: 'Hipercard' },
  { brandCode: 8, brand: 'Cup' },
  { brandCode: 9, brand: 'Calcard' },
  { brandCode: 10, brand: 'Construcard' },
  { brandCode: 11, brand: 'Avista' },
  { brandCode: 12, brand: 'Mais!' },
  { brandCode: 13, brand: 'Amex' },
  { brandCode: 14, brand: 'Elo' },
  { brandCode: 15, brand: 'Hiper' },
  { brandCode: 16, brand: 'Alelo' },
  { brandCode: 20, brand: 'Sodexo' },
  { brandCode: 21, brand: 'VR' },
  { brandCode: 22, brand: 'Greencard' },
  { brandCode: 23, brand: 'Nutricash' },
  { brandCode: 24, brand: 'Planvale' },
  { brandCode: 25, brand: 'Verocheque' },
  { brandCode: 26, brand: 'Coopercard' },
  { brandCode: 27, brand: 'Abrapetite' },
  { brandCode: 28, brand: 'Bamex Beneficios' },
  { brandCode: 29, brand: 'Biq Benefícios' },
  { brandCode: 30, brand: 'Bonuscred' },
  { brandCode: 31, brand: 'Convenios Card' },
  { brandCode: 32, brand: 'Credialimentacao' },
  { brandCode: 33, brand: 'Eucard' },
  { brandCode: 34, brand: 'Facecard' },
  { brandCode: 35, brand: 'Flex' },
  { brandCode: 36, brand: 'Goodcard' },
  { brandCode: 37, brand: 'Lecard' },
  { brandCode: 38, brand: 'Libercard' },
  { brandCode: 39, brand: 'Maxxcard' },
  { brandCode: 40, brand: 'Nutricard' },
  { brandCode: 41, brand: 'Ok Cartoes' },
  { brandCode: 42, brand: 'Onecard' },
  { brandCode: 43, brand: 'Sindplus' },
  { brandCode: 44, brand: 'UauhBeneficios' },
  { brandCode: 45, brand: 'Vale Shop' },
  { brandCode: 46, brand: 'Vegas Card' },
  { brandCode: 47, brand: 'Visasoft Pay' },
  { brandCode: 48, brand: 'Volus' },
  { brandCode: 49, brand: 'Vscard' },
  { brandCode: 50, brand: 'Up Brasil' },
  { brandCode: 51, brand: 'Verocard' },
  { brandCode: 52, brand: 'Ticket' },
  { brandCode: 53, brand: 'Van' },
  { brandCode: 54, brand: 'PLI itau FAI' },
  { brandCode: 55, brand: 'PL Bradesco' },
  { brandCode: 56, brand: 'PL Banco do Brasil' },
  { brandCode: 57, brand: 'PL Citibank' },
  { brandCode: 58, brand: 'PL Credsystem' },
  { brandCode: 59, brand: 'PL Porto Seguro' },
  { brandCode: 60, brand: 'Pagamento de Fatura' },
  { brandCode: 72, brand: 'Nova Bandeira' },
  { brandCode: 74, brand: 'Banescard' },
  { brandCode: 76, brand: 'Jcb' },
  { brandCode: 77, brand: 'Credz' },
  { brandCode: 999, brand: 'Outros' },
];
