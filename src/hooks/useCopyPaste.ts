import { useEffect } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';

/**
 * Atajos globales: Ctrl/Cmd+C copiar, Ctrl/Cmd+V pegar, Supr eliminar.
 * Shift+clic en un bloque lo suma/quita de la selección múltiple; copiar/pegar/
 * eliminar y arrastrar operan sobre todos los bloques seleccionados a la vez.
 * Ctrl/Cmd+Shift+C copiar semana, Ctrl/Cmd+Shift+V pegar semana (reemplaza),
 * Ctrl/Cmd+Shift+M pegar semana (combina).
 */
export function useCopyPaste() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable;
      if (inField) return;

      const state = useScheduleStore.getState();
      const isMod = e.ctrlKey || e.metaKey;

      // Deshacer / Rehacer
      if (isMod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        useScheduleStore.temporal.getState().undo();
        return;
      }
      if (isMod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        useScheduleStore.temporal.getState().redo();
        return;
      }

      if (isMod && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        state.copyWeek();
        return;
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        state.pasteWeek('replace');
        return;
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        state.pasteWeek('merge');
        return;
      }

      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'c' && state.selectedBlockIds.length > 0) {
        state.copySelectedBlocks();
        return;
      }

      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'v' && state.clipboardSelection) {
        // Pega duplicados en la misma posición (luego se pueden mover en bloque)
        state.pasteSelectedBlocks();
        return;
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        state.selectedBlockIds.length > 0 &&
        !state.activeModal
      ) {
        e.preventDefault();
        state.deleteSelectedBlocks();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
