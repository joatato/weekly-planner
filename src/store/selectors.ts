import { useMemo } from 'react';
import type { BlockType, ResolvedBlock } from '../types';
import { useScheduleStore } from './useScheduleStore';

/**
 * Hook: bloques de la semana actual, resueltos con su tipo embebido.
 * Filtra bloques huérfanos (cuyo tipo fue eliminado).
 *
 * Se seleccionan referencias estables (records) y se deriva con useMemo,
 * para evitar devolver un array nuevo en cada render (que rompería
 * useSyncExternalStore en Zustand v5).
 */
export function useCurrentWeekBlocks(): ResolvedBlock[] {
  const blocks = useScheduleStore((s) => s.blocks);
  const blockTypes = useScheduleStore((s) => s.blockTypes);
  const currentWeekKey = useScheduleStore((s) => s.currentWeekKey);

  return useMemo(() => {
    const result: ResolvedBlock[] = [];
    for (const b of Object.values(blocks)) {
      if (b.weekKey !== currentWeekKey) continue;
      const type = blockTypes[b.typeId];
      if (!type) continue;
      result.push({ ...b, type });
    }
    return result;
  }, [blocks, blockTypes, currentWeekKey]);
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
