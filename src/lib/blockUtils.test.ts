import { describe, expect, it } from 'vitest';
import { clampBlock, getContrastTextColor } from './blockUtils';
import { SLOT_COUNT } from './constants';

describe('clampBlock', () => {
  it('no toca un bloque que ya entra en la grilla', () => {
    expect(clampBlock(5, 3)).toEqual({ startSlot: 5, duration: 3 });
  });

  it('recorta un bloque que arranca antes del slot 0', () => {
    expect(clampBlock(-5, 2)).toEqual({ startSlot: 0, duration: 2 });
  });

  it('recorta un bloque que arranca después del último slot (33)', () => {
    // SLOT_COUNT - 1 = 33: el slot más tarde posible
    const result = clampBlock(SLOT_COUNT + 10, 4);
    expect(result.startSlot).toBe(SLOT_COUNT - 1);
    expect(result.duration).toBe(1); // sólo queda 1 slot libre desde ahí
  });

  it('recorta una duración mayor que la grilla entera', () => {
    const result = clampBlock(0, 999);
    expect(result.startSlot).toBe(0);
    expect(result.duration).toBe(SLOT_COUNT);
  });

  it('nunca deja la duración por debajo de 1 slot', () => {
    const result = clampBlock(SLOT_COUNT - 1, 0);
    expect(result.duration).toBeGreaterThanOrEqual(1);
  });
});

describe('getContrastTextColor', () => {
  it('devuelve texto claro sobre fondo oscuro', () => {
    expect(getContrastTextColor('#000000')).toBe('#ffffff');
  });

  it('devuelve texto oscuro sobre fondo claro', () => {
    expect(getContrastTextColor('#ffffff')).toBe('#1f2937');
  });

  it('soporta hex abreviado de 3 dígitos', () => {
    expect(getContrastTextColor('#fff')).toBe('#1f2937');
    expect(getContrastTextColor('#000')).toBe('#ffffff');
  });
});
