import { useState, useEffect } from 'react';
import type { RespuestaAlarma } from '../types';
import { useCurrentTime } from './useCurrentTime';
import { getCurrentWeekKey } from '../lib/dateUtils';
import { useScheduleStore } from '../store/useScheduleStore';
import { claveSlot, resolverSeguimiento } from '../lib/seguimiento';

export interface PreguntaAlarma {
  planId: string;
  slot: number;
  nombre: string;
  color: string;
  textColor: string;
  /** true si es el bucle volviendo a preguntar, no el arranque del bloque. */
  esSeguimiento: boolean;
}

/**
 * La alarma del semanal: cuando arranca un bloque —y cada 30 min si tiene
 * seguimiento— pregunta qué estás haciendo, y la respuesta se escribe en la
 * capa real.
 *
 * Dos cosas que no se ven pero importan:
 *
 * 1. Lee los bloques del store y no de la semana visible. Antes tomaba los
 *    bloques que estaban en pantalla, así que abrir la semana pasada para
 *    consultarla apagaba las alarmas de hoy sin que nada lo dijera.
 * 2. El "ya pregunté" vive en `slotsRespondidos`, persistido, y no en un ref.
 *    Con el ref se perdía al recargar y la alarma volvía a preguntar por un
 *    rato que ya habías contestado.
 *
 * No hace falta cola: `slotsRespondidos` va por slot, así que dos bloques de
 * plan pisados a la misma hora generan una sola pregunta. Es lo que
 * corresponde — a esa hora estuviste haciendo una cosa sola.
 */
export function useBlockAlerts(): {
  pregunta: PreguntaAlarma | null;
  responder: (respuesta: RespuestaAlarma) => void;
  descartar: () => void;
} {
  const currentTime = useCurrentTime();
  const [pregunta, setPregunta] = useState<PreguntaAlarma | null>(null);

  const blocks = useScheduleStore((s) => s.blocks);
  const blockTypes = useScheduleStore((s) => s.blockTypes);
  const settings = useScheduleStore((s) => s.settings);
  const slotsRespondidos = useScheduleStore((s) => s.slotsRespondidos);
  const responderAlarma = useScheduleStore((s) => s.responderAlarma);
  const cerrarRegistrosVencidos = useScheduleStore((s) => s.cerrarRegistrosVencidos);

  const { slot, todayDayOfWeek } = currentTime;

  useEffect(() => {
    const weekKey = getCurrentWeekKey();

    // Primero cerrar lo que quedó colgado: si la app estuvo cerrada, el bloque
    // en curso no se estira hasta ahora.
    cerrarRegistrosVencidos(weekKey, todayDayOfWeek, slot);

    if (pregunta) return; // ya hay una en pantalla
    if (slotsRespondidos[claveSlot(weekKey, todayDayOfWeek, slot)]) return;

    for (const b of Object.values(blocks)) {
      if (b.weekKey !== weekKey) continue;
      if (b.dayIndex !== todayDayOfWeek) continue;
      if ((b.capa ?? 'plan') !== 'plan') continue;
      if (slot < b.startSlot || slot >= b.startSlot + b.duration) continue;

      const type = blockTypes[b.typeId];
      if (!type) continue;

      // En el arranque siempre pregunta. En el medio del bloque, sólo si ese
      // bloque pidió seguimiento.
      const esInicio = b.startSlot === slot;
      if (!esInicio && !resolverSeguimiento(b, type, settings)) continue;

      setPregunta({
        planId: b.id,
        slot,
        nombre: type.name,
        color: type.color,
        textColor: type.textColor,
        esSeguimiento: !esInicio,
      });
      return;
    }
  }, [
    slot,
    todayDayOfWeek,
    blocks,
    blockTypes,
    settings,
    slotsRespondidos,
    pregunta,
    cerrarRegistrosVencidos,
  ]);

  const responder = (respuesta: RespuestaAlarma) => {
    if (!pregunta) return;
    responderAlarma(pregunta.planId, pregunta.slot, respuesta);
    setPregunta(null);
  };

  /** Cerrar sin contestar: vuelve a preguntar en el próximo tic. */
  const descartar = () => setPregunta(null);

  return { pregunta, responder, descartar };
}
