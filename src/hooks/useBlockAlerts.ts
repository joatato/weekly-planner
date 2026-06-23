import { useState, useEffect, useRef } from 'react';
import type { ResolvedBlock } from '../types';
import { useCurrentTime } from './useCurrentTime';
import { getCurrentWeekKey } from '../lib/dateUtils';

interface AlertState {
  blockName: string;
  blockColor: string;
  textColor: string;
}

/**
 * Detecta cuándo el tiempo actual cruza el startSlot de un bloque de HOY
 * en la semana actual, y expone el estado del cartel de alerta.
 */
export function useBlockAlerts(blocks: ResolvedBlock[]): {
  alert: AlertState | null;
  dismissAlert: () => void;
} {
  const currentTime = useCurrentTime();
  const [alert, setAlert] = useState<AlertState | null>(null);
  // Guarda los slots ya notificados en esta sesión para no repetir
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const weekKey = getCurrentWeekKey();
    const { slot, todayDayOfWeek } = currentTime;

    for (const block of blocks) {
      if (block.weekKey !== weekKey) continue;
      if (block.dayIndex !== todayDayOfWeek) continue;
      if (block.startSlot !== slot) continue;

      const key = block.id + ':' + slot;
      if (notifiedRef.current.has(key)) continue;

      notifiedRef.current.add(key);
      setAlert({
        blockName: block.type.name,
        blockColor: block.type.color,
        textColor: block.type.textColor,
      });
      break;
    }
  }, [currentTime.slot, blocks]);

  const dismissAlert = () => setAlert(null);

  return { alert, dismissAlert };
}
