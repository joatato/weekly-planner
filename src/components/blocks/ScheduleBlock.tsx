import { useDraggable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import type { ResolvedBlock } from '../../types';
import { useScheduleStore } from '../../store/useScheduleStore';
import { TIME_SLOTS } from '../../lib/constants';
import { darkenColor, type BlockLayout } from '../../lib/blockUtils';
import { cn } from '../../lib/cn';
import { BlockResizeHandle } from './BlockResizeHandle';
import { formatTimeLabel } from '../../lib/dateUtils';

interface ScheduleBlockProps {
  block: ResolvedBlock;
  layout: BlockLayout;
  visibleStartSlot: number;
  visibleEndSlot: number;
  /** Si es true aplica la animación de entrada (drop desde barra lateral) */
  animateIn?: boolean;
  /** Bloque de hoy cuya hora de fin ya pasó — se atenúa. */
  terminado?: boolean;
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

export function ScheduleBlock({ block, layout, visibleStartSlot, visibleEndSlot, animateIn, terminado }: ScheduleBlockProps) {
  const selectedBlockIds = useScheduleStore((s) => s.selectedBlockIds);
  const setSelectedBlock = useScheduleStore((s) => s.setSelectedBlock);
  const toggleSelectedBlock = useScheduleStore((s) => s.toggleSelectedBlock);
  const openModal = useScheduleStore((s) => s.openModal);
  const { layer, layerCount } = layout;
  const stepPct = Math.min(12, 60 / Math.max(layerCount, 1));
  const leftPct = layer * stepPct;
  const widthPct = 100 - leftPct;
  const { slotHeightPx, hourFormat } = useScheduleStore((s) => s.settings);

  const isSelected = selectedBlockIds.includes(block.id);

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
        left: `${leftPct}%`,
        width: `calc(${widthPct}% - 2px)`,
        backgroundColor: block.type.color,
        color: block.type.textColor,
        borderColor: darkenColor(block.type.color, 0.18),
        // Atenuar lo que ya pasó deja ver en qué punto del día estás sin leer
        // una sola hora. Salvo que esté seleccionado: si lo vas a editar o
        // borrar, tenés que poder verlo bien.
        opacity: isDragging ? 0.35 : terminado && !isSelected ? 0.45 : 1,
        zIndex: layer * 10 + (isSelected ? 5 : 0),
      }}
      className={cn(
        'group relative m-px flex flex-col overflow-hidden rounded-md border px-2 py-1 text-left',
        'cursor-grab touch-none select-none transition-[box-shadow,opacity] active:cursor-grabbing',
        compact ? 'justify-center' : 'justify-start',
        isSelected
          ? 'shadow-md ring-2 ring-indigo-500 ring-offset-1'
          : 'shadow-sm hover:shadow-md',
        animateIn && 'animate-block-pop-in',
      )}
      {...listeners}
      {...attributes}
      data-bloque="calendar.block"
      onClick={(e) => {
        e.stopPropagation();
        if (e.shiftKey) {
          toggleSelectedBlock(block.id);
        } else {
          setSelectedBlock(block.id);
        }
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

      <button
        type="button"
        className={cn(
          'absolute right-0.5 top-0.5 rounded-full bg-black/20 text-white transition-colors hover:bg-black/40',
          // Sin mouse no hay hover, así que en táctil este botón no existía.
          // Aparece con el bloque seleccionado: no ensucia la grilla y no se
          // pisa con el toque que selecciona o arrastra.
          isSelected ? 'block' : 'hidden',
          'p-1.5 lg:hidden lg:p-0.5 lg:group-hover:block',
        )}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          openModal('createBlock', { dayIndex: block.dayIndex, startSlot: block.startSlot, duration: 1 });
        }}
        aria-label={`Agregar bloque sobre ${block.type.name}`}
      >
        <Plus size={11} />
      </button>

      <BlockResizeHandle blockId={block.id} />
    </div>
  );
}
