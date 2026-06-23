import type { ResolvedBlock } from '../../types';
import { useScheduleStore } from '../../store/useScheduleStore';
import { darkenColor } from '../../lib/blockUtils';

interface BlockDragOverlayProps {
  block: ResolvedBlock;
  width: number;
}

/** Clon flotante que sigue al cursor durante el arrastre. */
export function BlockDragOverlay({ block, width }: BlockDragOverlayProps) {
  const slotHeightPx = useScheduleStore((s) => s.settings.slotHeightPx);
  return (
    <div
      style={{
        height: block.duration * slotHeightPx - 2,
        width,
        backgroundColor: block.type.color,
        color: block.type.textColor,
        borderColor: darkenColor(block.type.color, 0.18),
      }}
      className="flex flex-col overflow-hidden rounded-md border px-2 py-1 text-left shadow-lg ring-2 ring-indigo-400"
    >
      <span className="truncate text-xs font-semibold leading-tight">
        {block.type.name}
      </span>
    </div>
  );
}
