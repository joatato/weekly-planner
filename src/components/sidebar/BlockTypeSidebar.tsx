import { Plus, MousePointerClick, Move, Copy, Trash2, Undo2, GripVertical } from 'lucide-react';
import { useOrderedBlockTypes } from '../../store/selectors';
import { useScheduleStore } from '../../store/useScheduleStore';
import { BlockTypeChip } from './BlockTypeChip';

export function BlockTypeSidebar() {
  const types = useOrderedBlockTypes();
  const openModal = useScheduleStore((s) => s.openModal);

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Tipos de bloque
          </h2>
          <button
            onClick={() => openModal('createType')}
            aria-label="Crear tipo"
            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {types.map((type) => (
            <BlockTypeChip key={type.id} type={type} />
          ))}
        </div>
      </div>

      <div className="mt-auto rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Cómo usar
        </h3>
        <ul className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400">
          <li className="flex items-center gap-2">
            <MousePointerClick size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
            Clic en una celda para crear
          </li>
          <li className="flex items-center gap-2">
            <GripVertical size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
            Arrastrá un tipo al semanal para crear
          </li>
          <li className="flex items-center gap-2">
            <Move size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
            Arrastrá un bloque para moverlo
          </li>
          <li className="flex items-center gap-2">
            <Copy size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
            Ctrl+C / Ctrl+V para copiar
          </li>
          <li className="flex items-center gap-2">
            <Trash2 size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
            Supr para eliminar el seleccionado
          </li>
          <li className="flex items-center gap-2">
            <Undo2 size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
            Ctrl+Z deshacer / Ctrl+Shift+Z rehacer
          </li>
        </ul>
      </div>
    </aside>
  );
}
