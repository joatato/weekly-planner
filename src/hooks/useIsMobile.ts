import { useSyncExternalStore } from 'react';

/** Ancho máximo (px) considerado "móvil". Coincide con el breakpoint `md` de Tailwind. */
const MOBILE_QUERY = '(max-width: 767px)';

function subscribe(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

/**
 * Retorna true cuando el viewport es de ancho móvil (< 768px).
 * Usa useSyncExternalStore para mantenerse en sync sin efectos manuales.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
