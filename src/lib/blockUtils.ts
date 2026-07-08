import { SLOT_COUNT } from './constants';
import type { ResolvedBlock } from '../types';

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

export interface BlockLayout {
  layer: number; // 0 = capa más abajo
  layerCount: number; // total de capas en su grupo de solapamiento
}

/**
 * Agrupa bloques de un mismo día que se solapan en el tiempo y les asigna
 * una capa (0 = más abajo) mediante coloreo de intervalos (first-fit greedy).
 * Derivación pura de render — no muta ni persiste nada.
 */
export function computeBlockLayout(dayBlocks: ResolvedBlock[]): Map<string, BlockLayout> {
  const sorted = [...dayBlocks].sort(
    (a, b) => a.startSlot - b.startSlot || b.duration - a.duration || a.id.localeCompare(b.id),
  );

  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let p = parent.get(id) ?? id;
    while (parent.get(p) && parent.get(p) !== p) p = parent.get(p)!;
    parent.set(id, p);
    return p;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const b of sorted) parent.set(b.id, b.id);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (a.startSlot + a.duration <= b.startSlot) break;
      if (a.startSlot < b.startSlot + b.duration && b.startSlot < a.startSlot + a.duration) {
        union(a.id, b.id);
      }
    }
  }

  const groups = new Map<string, ResolvedBlock[]>();
  for (const b of sorted) {
    const root = find(b.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(b);
  }

  const result = new Map<string, BlockLayout>();
  for (const group of groups.values()) {
    const layerEnds: number[] = [];
    const assigned: { block: ResolvedBlock; layer: number }[] = [];
    for (const b of group) {
      let layer = layerEnds.findIndex((end) => end <= b.startSlot);
      if (layer === -1) {
        layer = layerEnds.length;
        layerEnds.push(b.startSlot + b.duration);
      } else {
        layerEnds[layer] = b.startSlot + b.duration;
      }
      assigned.push({ block: b, layer });
    }
    const layerCount = layerEnds.length;
    for (const { block, layer } of assigned) {
      result.set(block.id, { layer, layerCount });
    }
  }
  return result;
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
