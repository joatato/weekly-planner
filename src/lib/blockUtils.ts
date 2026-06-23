import { SLOT_COUNT } from './constants';

/**
 * Calcula el color de texto (oscuro o claro) con mejor contraste sobre
 * un color de fondo hex, usando luminancia relativa (WCAG).
 */
export function getContrastTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

/** Restringe un startSlot+duration para que no se salga de la grilla */
export function clampBlock(startSlot: number, duration: number) {
  const clampedStart = Math.max(0, Math.min(startSlot, SLOT_COUNT - 1));
  const maxDuration = SLOT_COUNT - clampedStart;
  const clampedDuration = Math.max(1, Math.min(duration, maxDuration));
  return { startSlot: clampedStart, duration: clampedDuration };
}

/** Oscurece un color hex un porcentaje (0-1) — usado para bordes */
export function darkenColor(hexColor: string, amount = 0.15): string {
  const hex = hexColor.replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const r = Math.round(parseInt(full.substring(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(full.substring(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(full.substring(4, 6), 16) * (1 - amount));
  const toHex = (n: number) => Math.max(0, n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
