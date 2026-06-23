import type { BlockType } from '../../types';
import { darkenColor } from '../../lib/blockUtils';

interface BlockTypeDragOverlayProps {
  type: BlockType;
}

/**
 * Preview flotante que sigue al cursor mientras se arrastra un tipo de bloque
 * desde la barra lateral hacia la grilla semanal.
 */
export function BlockTypeDragOverlay({ type }: BlockTypeDragOverlayProps) {
  return (
    <div
      style={{
        backgroundColor: type.color,
        color: type.textColor,
        borderColor: darkenColor(type.color, 0.18),
      }}
      className="flex items-center gap-2.5 rounded-lg border px-3 py-2 shadow-2xl ring-2 ring-indigo-400 ring-offset-1"
    >
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-sm border"
        style={{
          backgroundColor: darkenColor(type.color, 0.2),
          borderColor: darkenColor(type.color, 0.35),
        }}
      />
      <span className="text-sm font-semibold">{type.name}</span>
    </div>
  );
}
