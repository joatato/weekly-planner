import { useCallback } from 'react';

/** Dispara el diálogo de impresión del navegador (PDF / A4). */
export function usePrint() {
  return useCallback(() => {
    window.print();
  }, []);
}
