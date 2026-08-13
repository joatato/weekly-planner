import { useMemo } from 'react';
import type { BlockType, Capa, ResolvedBlock } from '../types';
import { useScheduleStore } from './useScheduleStore';

/**
 * Hook: bloques de la semana actual de una capa, resueltos con su tipo.
 * Filtra bloques huérfanos (cuyo tipo fue eliminado).
 *
 * El default es 'plan' a propósito: antes de la capa de registro todos los
 * bloques eran el plan, así que quien no elige capa —impresión, alarmas—
 * sigue viendo exactamente lo mismo que antes.
 *
 * Se seleccionan referencias estables (records) y se deriva con useMemo,
 * para evitar devolver un array nuevo en cada render (que rompería
 * useSyncExternalStore en Zustand v5).
 */
export function useCurrentWeekBlocks(capa: Capa = 'plan'): ResolvedBlock[] {
  const blocks = useScheduleStore((s) => s.blocks);
  const blockTypes = useScheduleStore((s) => s.blockTypes);
  const currentWeekKey = useScheduleStore((s) => s.currentWeekKey);

  return useMemo(() => {
    const result: ResolvedBlock[] = [];
    for (const b of Object.values(blocks)) {
      if (b.weekKey !== currentWeekKey) continue;
      if ((b.capa ?? 'plan') !== capa) continue;
      const type = blockTypes[b.typeId];
      if (!type) continue;
      result.push({ ...b, type });
    }
    return result;
  }, [blocks, blockTypes, currentWeekKey, capa]);
}

export interface TotalPorTipo {
  type: BlockType;
  slots: number;
  /** Slots de 30 min pasados a horas: 5 slots = 2.5 */
  horas: number;
}

/**
 * Cuánto ocupa cada tipo en la semana visible, de mayor a menor.
 *
 * Se apoya en `useCurrentWeekBlocks`, así que los bloques huérfanos —los que
 * quedaron apuntando a un tipo borrado— ya vienen filtrados y no suman a un
 * total que no se podría mostrar.
 */
export function useHorasPorTipo(): TotalPorTipo[] {
  const blocks = useCurrentWeekBlocks();

  return useMemo(() => {
    const porTipo = new Map<string, TotalPorTipo>();
    for (const b of blocks) {
      const acumulado = porTipo.get(b.typeId);
      if (acumulado) acumulado.slots += b.duration;
      else porTipo.set(b.typeId, { type: b.type, slots: b.duration, horas: 0 });
    }
    const total = [...porTipo.values()];
    for (const t of total) t.horas = t.slots / 2;
    // Desempate por nombre: sin esto, dos tipos con las mismas horas se
    // intercambian de lugar entre renders según el orden del Map.
    return total.sort((a, b) => b.slots - a.slots || a.type.name.localeCompare(b.type.name));
  }, [blocks]);
}

/** "18 h", "2 h 30", "30 min" — lo más corto que se lee sin ambigüedad. */
export function formatearHoras(horas: number): string {
  const totalMin = Math.round(horas * 60);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0) return `${min} min`;
  if (min === 0) return `${h} h`;
  return `${h} h ${min}`;
}

/** Hook: lista ordenada de tipos de bloque para el sidebar */
export function useOrderedBlockTypes(): BlockType[] {
  const blockTypes = useScheduleStore((s) => s.blockTypes);
  const order = useScheduleStore((s) => s.blockTypeOrder);

  return useMemo(
    () => order.map((id) => blockTypes[id]).filter((t): t is BlockType => t != null),
    [blockTypes, order],
  );
}
