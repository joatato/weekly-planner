import { Copy, Pencil, Trash2, X } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';

/**
 * Acciones del bloque seleccionado, en móvil.
 *
 * Sin esto el teléfono es de solo-creación: editar sale de un `onDoubleClick`
 * en ScheduleBlock —el único caller de `openModal('editBlock')` en todo el
 * repo— y copiar, pegar y borrar solo existen como atajos de teclado.
 *
 * Es una barra y no un gesto a propósito. Un long-press competiría con el
 * TouchSensor de dnd-kit, que arranca el arrastre a los 200 ms: el gesto nunca
 * llegaría a completarse. Tocar para seleccionar ya funciona hoy, así que la
 * barra se cuelga de eso y no inventa ninguna interacción nueva.
 */
export function BlockActionBar() {
  const selectedBlockIds = useScheduleStore((s) => s.selectedBlockIds);
  const openModal = useScheduleStore((s) => s.openModal);
  const setSelectedBlock = useScheduleStore((s) => s.setSelectedBlock);
  const deleteSelectedBlocks = useScheduleStore((s) => s.deleteSelectedBlocks);
  const copySelectedBlocks = useScheduleStore((s) => s.copySelectedBlocks);
  const pasteSelectedBlocks = useScheduleStore((s) => s.pasteSelectedBlocks);

  if (selectedBlockIds.length === 0) return null;

  const unico = selectedBlockIds.length === 1;

  const accion =
    'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors active:scale-95';

  return (
    <div
      data-bloque="calendar.acciones-bloque"
      /* `mx-auto max-w-sm`: en el teléfono apaisado la barra se estiraba a lo
         ancho de la pantalla y se comía la mitad de una grilla que ya es baja. */
      className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-sm items-center gap-1 rounded-xl border border-gray-200 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 lg:hidden"
    >
      <button
        type="button"
        // Editar necesita un bloque concreto: con varios seleccionados no hay
        // uno solo al que abrirle el modal.
        disabled={!unico}
        onClick={() => openModal('editBlock', { blockId: selectedBlockIds[0] })}
        className={`${accion} text-gray-700 hover:bg-gray-50 disabled:opacity-30 dark:text-gray-200 dark:hover:bg-gray-800`}
      >
        <Pencil size={17} />
        Editar
      </button>

      <button
        type="button"
        onClick={() => {
          copySelectedBlocks();
          pasteSelectedBlocks();
        }}
        className={`${accion} text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800`}
      >
        <Copy size={17} />
        Duplicar
      </button>

      <button
        type="button"
        onClick={deleteSelectedBlocks}
        className={`${accion} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40`}
      >
        <Trash2 size={17} />
        Borrar
      </button>

      <div className="mx-0.5 h-8 w-px shrink-0 bg-gray-200 dark:bg-gray-700" />

      <button
        type="button"
        onClick={() => setSelectedBlock(null)}
        aria-label="Deseleccionar"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        {selectedBlockIds.length > 1 ? (
          <span className="text-xs font-semibold">{selectedBlockIds.length}</span>
        ) : (
          <X size={18} />
        )}
      </button>
    </div>
  );
}
