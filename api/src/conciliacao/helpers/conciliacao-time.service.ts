import { Injectable } from '@nestjs/common';

@Injectable()
export class ConciliacaoTimeHelper {
  getHoraNormalizada(item: any): number {
    let hora =
      item.trier?.hora || item.rede?.horaVenda || item.cielo?.timeVenda;

    if (!hora) return 0;

    // 🟡 Caso seja Date (UTC vindo do banco)
    if (hora instanceof Date) {
      const data = new Date(hora);

      // ajusta UTC → Brasil (-3h)

      const h = data.getHours().toString().padStart(2, '0');
      const m = data.getMinutes().toString().padStart(2, '0');
      const s = data.getSeconds().toString().padStart(2, '0');

      return Number(`${h}${m}${s}`);
    }

    // 🟡 Caso seja string
    if (typeof hora === 'string') {
      // remove ":"
      let normalizada = hora.replace(/:/g, '');

      // se for UTC (trier/rede), ajusta -3h manualmente
      if (item.trier || item.rede) {
        const h = Number(normalizada.slice(0, 2));
        const m = normalizada.slice(2, 4);
        const s = normalizada.slice(4, 6);

        let horaAjustada = h - 3;
        if (horaAjustada < 0) horaAjustada += 24;

        return Number(`${horaAjustada.toString().padStart(2, '0')}${m}${s}`);
      }
      return Number(normalizada);
    }

    return 0;
  }

  getHoraFormatada(item: any): string | null {
    const horaRaw =
      item.trier?.hora || item.rede?.horaVenda || item.cielo?.timeVenda;

    if (!horaRaw) return null;

    // 🟡 CASO CIELO (HHMMSS)
    if (item.cielo?.timeVenda) {
      const hora = horaRaw.toString().trim();

      if (hora.length === 6) {
        const h = hora.slice(0, 2);
        const m = hora.slice(2, 4);
        const s = hora.slice(4, 6);

        return `${h}:${m}:${s}`;
      }
    }

    // 🟡 CASO DATE (TRIER / REDE - UTC)
    if (horaRaw instanceof Date || typeof horaRaw === 'string') {
      const data = new Date(horaRaw);

      const h = data.getHours().toString().padStart(2, '0');
      const m = data.getMinutes().toString().padStart(2, '0');
      const s = data.getSeconds().toString().padStart(2, '0');

      return `${h}:${m}:${s}`;
    }

    return null;
  }
}
