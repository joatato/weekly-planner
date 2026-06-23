import { useDroppable } from '@dnd-kit/core';
import { useScheduleStore } from '../../store/useScheduleStore';
import { cn } from '../../lib/cn';

interface EmptySlotProps {
  dayIndex: number;
  slotIndex: number; // índice absoluto en TIME_SLOTS (para crear bloque)
  gridRow: number;   // fila visual en el CSS grid (relativa al rango visible)
}

export function EmptySlot({ dayIndex, slotIndex, gridRow }: EmptySlotProps) {
  const openModal = useScheduleStore((s) => s.openModal);
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${dayIndex}-${slotIndex}`,
    data: { dayIndex, slotIndex },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => openModal('createBlock', { dayIndex, startSlot: slotIndex })}
      style={{ gridRow: `${gridRow} / span 1`, gridColumn: 1 }}
      className={cn(
        'cursor-pointer border-t transition-colors',
        slotIndex % 2 === 0
          ? 'border-gray-100 dark:border-gray-800'
          : 'border-gray-50 dark:border-gray-800/50',
        isOver
          ? 'bg-indigo-100/70 dark:bg-indigo-900/50'
          : 'hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40',
      )}
    />
  );
}
