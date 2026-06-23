import { useDraggable } from '@dnd-kit/core';
import type { ResolvedBlock } from '../../types';
import { useScheduleStore } from '../../store/useScheduleStore';
import { TIME_SLOTS } from '../../lib/constants';
import { darkenColor } from '../../lib/blockUtils';
import { cn } from '../../lib/cn';
import { BlockResizeHandle } from './BlockResizeHandle';
import { formatTimeLabel } from '../../lib/dateUtils';

interface ScheduleBlockProps {
  block: ResolvedBlock;
  visibleStartSlot: number;
  visibleEndSlot: number;
  /** Si es true aplica la animación de entrada (drop desde barra lateral) */
  animateIn?: boolean;
}

function timeRange(startSlot: number, duration: number, hourFormat: '24h' | '12h'): string {
  const start = TIME_SLOTS[startSlot];
  const endIndex = Math.min(startSlot + duration, TIME_SLOTS.length - 1);
  const endSlot = TIME_SLOTS[endIndex];
  const endLabel =
    startSlot + duration >= TIME_SLOTS.length
      ? formatTimeLabel(23, 0, hourFormat)
      : formatTimeLabel(endSlot.hour, endSlot.minute, hourFormat);
  return `${formatTimeLabel(start.hour, start.minute, hourFormat)} – ${endLabel}`;
}

export function ScheduleBlock({ block, visibleStartSlot, visibleEndSlot, animateIn }: ScheduleBlockProps) {
  const selectedBlockId = useScheduleStore((s) => s.selectedBlockId);
  const setSelectedBlock = useScheduleStore((s) => s.setSelectedBlock);
  const openModal = useScheduleStore((s) => s.openModal);
  const { slotHeightPx, hourFormat } = useScheduleStore((s) => s.settings);

  const isSelected = selectedBlockId === block.id;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id,
    data: { type: 'block', blockId: block.id },
  });

  // Clip al rango visible
  const displayStart = Math.max(block.startSlot, visibleStartSlot);
  const displayEnd = Math.min(block.startSlot + block.duration, visibleEndSlot + 1);
  const displayDuration = displayEnd - displayStart;
  const gridRowStart = displayStart - visibleStartSlot + 1;

  const heightPx = displayDuration * slotHeightPx;
  const compact = displayDuration <= 1;

  return (
    <div
      ref={setNodeRef}
      style={{
        gridRow: `${gridRowStart} / span ${displayDuration}`,
        gridColumn: 1,
        backgroundColor: block.type.color,
        color: block.type.textColor,
        borderColor: darkenColor(block.type.color, 0.18),
        opacity: isDragging ? 0.35 : 1,
        zIndex: isSelected ? 20 : 10,
      }}
      className={cn(
        'group relative m-px flex flex-col overflow-hidden rounded-md border px-2 py-1 text-left',
        'cursor-grab touch-none select-none transition-shadow active:cursor-grabbing',
        compact ? 'justify-center' : 'justify-start',
        isSelected
          ? 'shadow-md ring-2 ring-indigo-500 ring-offset-1'
          : 'shadow-sm hover:shadow-md',
        animateIn && 'animate-block-pop-in',
      )}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedBlock(block.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        openModal('editBlock', { blockId: block.id });
      }}
      role="button"
      aria-label={`${block.type.name}, ${timeRange(block.startSlot, block.duration, hourFormat)}`}
    >
      <span
        className={cn(
          'truncate font-semibold leading-tight',
          compact ? 'text-[11px]' : 'text-xs',
        )}
      >
        {block.type.name}
      </span>

      {!compact && heightPx >= slotHeightPx * 2 && (
        <span className="truncate text-[10px] opacity-70">
          {timeRange(block.startSlot, block.duration, hourFormat)}
        </span>
      )}

      {block.note && !compact && heightPx >= slotHeightPx * 3 && (
        <span className="mt-0.5 line-clamp-2 text-[10px] opacity-80">{block.note}</span>
      )}

      <BlockResizeHandle blockId={block.id} />
    </div>
  );
}
