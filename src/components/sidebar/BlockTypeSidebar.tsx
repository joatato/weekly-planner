import { Plus, MousePointerClick, Move, Copy, Trash2, Undo2, GripVertical, X } from 'lucide-react';
import { useOrderedBlockTypes } from '../../store/selectors';
import { useScheduleStore } from '../../store/useScheduleStore';
import { BlockTypeChip } from './BlockTypeChip';
import { cn } from '../../lib/cn';

interface BlockTypeSidebarProps {
  /** Sólo aplica en móvil: si el drawer está abierto */
  isOpen?: boolean;
  onClose?: () => void;
}

export function BlockTypeSidebar({ isOpen = false, onClose }: BlockTypeSidebarProps) {
  const types = useOrderedBlockTypes();
  const openModal = useScheduleStore((s) => s.openModal);

  const content = (
    <>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Tipos de bloque
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => openModal('createType')}
              aria-label="Crear tipo"
              className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:h-6 lg:w-6"
            >
              <Plus size={16} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:hidden"
              >
                <X size={16} />
              </button>
            )}
          </div>
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
            <Copy size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
            Ctrl+Shift+C copia la semana, Ctrl+Shift+V/M la pega
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
    </>
  );

  return (
    <>
      {/* Escritorio: columna fija siempre visible */}
      <aside
        data-bloque="calendar.sidebar"
        className="hidden w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 lg:flex"
      >
        {content}
      </aside>

      {/* Móvil: drawer deslizable con backdrop */}
      <div className="lg:hidden">
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/40 transition-opacity',
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onClick={onClose}
        />
        <aside
          data-bloque="calendar.sidebar"
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto bg-white p-4 shadow-xl transition-transform duration-200 dark:bg-gray-900',
            isOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {content}
        </aside>
      </div>
    </>
  );
}
