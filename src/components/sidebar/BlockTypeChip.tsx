import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Pencil } from 'lucide-react';
import type { BlockType } from '../../types';
import { useScheduleStore } from '../../store/useScheduleStore';
import { darkenColor } from '../../lib/blockUtils';
import { cn } from '../../lib/cn';

interface BlockTypeChipProps {
  type: BlockType;
}

/**
 * Fila de tipo de bloque en la barra lateral.
 *
 * - Arrastrá el chip hacia la grilla para crear un bloque nuevo en ese slot.
 * - Hacé clic en el lápiz para editar el tipo.
 *
 * El arrastre usa PointerSensor con 5 px de activación (heredado del DndContext
 * padre), por lo que un clic simple no dispara el drag.
 */
export function BlockTypeChip({ type }: BlockTypeChipProps) {
  const openModal = useScheduleStore((s) => s.openModal);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `block-type-${type.id}`,
    data: { type: 'block-type', blockTypeId: type.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-150',
        'hover:bg-gray-50 dark:hover:bg-gray-800',
        isDragging && 'opacity-40 scale-95',
      )}
    >
      {/* Handle de arrastre */}
      <button
        {...listeners}
        {...attributes}
        className={cn(
          'cursor-grab touch-none rounded p-0.5 text-gray-300 transition-colors',
          'hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400',
          'active:cursor-grabbing',
          // Siempre visible para dejar claro que es draggable
          'opacity-60 group-hover:opacity-100',
        )}
        aria-label={`Arrastrar tipo "${type.name}" a la grilla`}
        tabIndex={-1}
      >
        <GripVertical size={13} />
      </button>

      {/* Indicador de color */}
      <span
        className="h-4 w-4 shrink-0 rounded border"
        style={{
          backgroundColor: type.color,
          borderColor: darkenColor(type.color, 0.18),
        }}
      />

      {/* Nombre */}
      <span className="flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-200">
        {type.name}
      </span>

      {/* Botón editar */}
      <button
        onClick={() => openModal('editType', { typeId: type.id })}
        className={cn(
          'shrink-0 rounded p-0.5 text-gray-300 transition-colors',
          'opacity-0 group-hover:opacity-100',
          'hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400',
        )}
        aria-label={`Editar tipo "${type.name}"`}
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}
