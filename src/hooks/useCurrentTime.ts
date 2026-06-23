import { useState, useEffect } from 'react';
import { START_HOUR } from '../lib/constants';

export interface CurrentTime {
  slot: number;       // índice absoluto en TIME_SLOTS (0-based)
  offsetPct: number;  // 0–1, qué fracción del slot ha pasado (para posicionar la línea)
  todayDayOfWeek: number; // 0=Lunes … 6=Domingo (igual que dayIndex)
}

function compute(): CurrentTime {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const totalMins = (h - START_HOUR) * 60 + m;
  const slot = Math.floor(totalMins / 30);
  const offsetPct = (totalMins % 30) / 30;
  // JS: 0=Dom → convertir a 0=Lun
  const jsDay = now.getDay();
  const todayDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
  return { slot, offsetPct, todayDayOfWeek };
}

/** Retorna la posición exacta del tiempo actual, actualizada cada 30 s. */
export function useCurrentTime(): CurrentTime {
  const [value, setValue] = useState<CurrentTime>(compute);

  useEffect(() => {
    const id = setInterval(() => setValue(compute()), 30_000);
    return () => clearInterval(id);
  }, []);

  return value;
}
