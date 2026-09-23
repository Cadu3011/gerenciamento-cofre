export const ADQUIRENTE_IFOOD = 'IFOOD';
export const ADQUIRENTE_PAGGPIX = 'PAGGPIX';
export const ADQUIRENTE_BRASILCARD = 'BRASILCARD';
export const ADQUIRENTE_INDEFINIDO = 'INDEFINIDO';
export const ADQUIRENTE_REDE = 'REDE';
export const ADQUIRENTE_CIELO = 'CIELO';
export const ADQUIRENTE_CIELO_PIX = 'CIELO PIX';

/**
 * Bandeiras (nomeCartao) fornecidas pela Trier que possuem previsão própria
 * (Rede e Cielo têm APIs/arquivos próprios) e por isso devem ser EXCLUÍDAS
 * da previsão via Trier, evitando dupla contagem.
 */
export const BANDEIRAS_REDE = [
  'MASTERCARD',
  'VISA',
  'DINERS',
  'CABAL',
  'ELO',
  'HIPERCARD',
  'AMERICAN EXPRESS',
  'AURA',
  'BANES',
];

export const BANDEIRAS_CIELO = [
  'VISA',
  'MASTERCARD',
  'AMERICAN EXPRESS',
  'SOROCRED',
  'ELO',
  'DINERS',
  'AGIPLAN',
  'BANESCARD',
  'CABAL',
  'CREDSYSTEM',
  'ESPLANADA',
  'HIPERCARD',
  'JCB',
  'CREDZ',
  'HIPER',
  'OUROCARD',
  'PIX',
];

/**
 * Mapas bandeira Trier (nomeCartao) -> adquirente sem API própria.
 */
export const BANDEIRA_ADQUIRENTE_MAP: Record<string, string> = {
  'PAGAMENTO ONLINE IFOOD': ADQUIRENTE_IFOOD,
  'PIX SEGURO - PAGGPIX': ADQUIRENTE_PAGGPIX,
  PAGGPIX: ADQUIRENTE_PAGGPIX,
  BRASILCARD: ADQUIRENTE_BRASILCARD,
  'BRASILCARD 1X': ADQUIRENTE_BRASILCARD,
  'BRASILCARD 2X': ADQUIRENTE_BRASILCARD,
  'BRASILCARD 3X': ADQUIRENTE_BRASILCARD,
};

export function mapearBandeiraTrier(bandeira: string): string | null {
  if (!bandeira) return null;

  const upper = bandeira.trim().toUpperCase();

  if (BANDEIRA_ADQUIRENTE_MAP[upper]) {
    return BANDEIRA_ADQUIRENTE_MAP[upper];
  }

  if (BANDEIRAS_REDE.includes(upper)) {
    return ADQUIRENTE_REDE;
  }

  if (BANDEIRAS_CIELO.includes(upper)) {
    return ADQUIRENTE_CIELO;
  }

  if (upper.startsWith('BRASILCARD')) {
    return ADQUIRENTE_BRASILCARD;
  }

  return null;
}
