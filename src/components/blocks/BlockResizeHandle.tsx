import { useCallback } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';

interface BlockResizeHandleProps {
  blockId: string;
}

export function BlockResizeHandle({ blockId }: BlockResizeHandleProps) {
  const resizeBlock = useScheduleStore((s) => s.resizeBlock);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const block = useScheduleStore.getState().blocks[blockId];
      if (!block) return;

      const startY = e.clientY;
      const originalDuration = block.duration;

      const onMove = (moveEvent: PointerEvent) => {
        const slotHeightPx = useScheduleStore.getState().settings.slotHeightPx;
        const deltaSlots = Math.round((moveEvent.clientY - startY) / slotHeightPx);
        const newDuration = Math.max(1, originalDuration + deltaSlots);
        resizeBlock(blockId, newDuration);
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [blockId, resizeBlock],
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
      role="separator"
      aria-label="Cambiar duración"
      className="absolute inset-x-0 bottom-0 z-30 flex h-2.5 cursor-ns-resize items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
    >
      <div className="h-1 w-8 rounded-full bg-black/30" />
    </div>
  );
}
