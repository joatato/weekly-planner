import { useEffect } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';

/** Atajos globales: Ctrl/Cmd+C copiar, Ctrl/Cmd+V pegar, Supr eliminar. */
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

      if (isMod && e.key.toLowerCase() === 'c' && state.selectedBlockId) {
        state.copyBlock(state.selectedBlockId);
        return;
      }

      if (isMod && e.key.toLowerCase() === 'v' && state.clipboardBlock) {
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
