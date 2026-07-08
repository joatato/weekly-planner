import { useEffect } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';

/**
 * Atajos globales: Ctrl/Cmd+C copiar, Ctrl/Cmd+V pegar, Supr eliminar.
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

      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'c' && state.selectedBlockId) {
        state.copyBlock(state.selectedBlockId);
        return;
      }

      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'v' && state.clipboardBlock) {
        // Pega en la misma posición de la semana actual (luego se puede mover)
        state.pasteBlock(state.clipboardBlock.dayIndex, state.clipboardBlock.startSlot);
        return;
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        state.selectedBlockId &&
        !state.activeModal
      ) {
        e.preventDefault();
        state.deleteBlock(state.selectedBlockId);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
