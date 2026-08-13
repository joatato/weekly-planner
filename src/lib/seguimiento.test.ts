import { describe, it, expect } from 'vitest';
import { claveSlot, resolverSeguimiento, slotSiguiente } from './seguimiento';

const global = (seguimientoGlobal: boolean) => ({ seguimientoGlobal });

describe('resolverSeguimiento', () => {
  it('sin nada declarado usa el ajuste global', () => {
    expect(resolverSeguimiento({}, {}, global(true))).toBe(true);
    expect(resolverSeguimiento({}, {}, global(false))).toBe(false);
  });

  it('el tipo le gana al global', () => {
    expect(resolverSeguimiento({}, { seguimiento: 'si' }, global(false))).toBe(true);
    expect(resolverSeguimiento({}, { seguimiento: 'no' }, global(true))).toBe(false);
  });

  it('el bloque le gana al tipo', () => {
    expect(
      resolverSeguimiento({ seguimiento: 'no' }, { seguimiento: 'si' }, global(true)),
    ).toBe(false);
    expect(
      resolverSeguimiento({ seguimiento: 'si' }, { seguimiento: 'no' }, global(false)),
    ).toBe(true);
  });

  it("'heredar' delega hacia arriba en vez de decidir", () => {
    // El bloque hereda del tipo, que dice que sí, aunque el global diga que no.
    expect(
      resolverSeguimiento({ seguimiento: 'heredar' }, { seguimiento: 'si' }, global(false)),
    ).toBe(true);
    // Los dos heredan → decide el global.
    expect(
      resolverSeguimiento(
        { seguimiento: 'heredar' },
        { seguimiento: 'heredar' },
        global(true),
      ),
    ).toBe(true);
  });

  it('un tipo borrado no rompe la cascada: cae al global', () => {
    expect(resolverSeguimiento({}, undefined, global(true))).toBe(true);
    expect(resolverSeguimiento({ seguimiento: 'no' }, undefined, global(true))).toBe(false);
  });
});

describe('slotSiguiente', () => {
  it('es el slot en el que continuaría el bloque', () => {
    // Arranca en 10 y dura 3 → ocupa 10, 11 y 12; sigue en el 13.
    expect(slotSiguiente({ startSlot: 10, duration: 3 })).toBe(13);
    expect(slotSiguiente({ startSlot: 0, duration: 1 })).toBe(1);
  });
});

describe('claveSlot', () => {
  it('distingue día y slot dentro de la misma semana', () => {
    expect(claveSlot('2026-W23', 0, 5)).toBe('2026-W23:0:5');
    expect(claveSlot('2026-W23', 0, 5)).not.toBe(claveSlot('2026-W23', 1, 5));
    expect(claveSlot('2026-W23', 0, 5)).not.toBe(claveSlot('2026-W24', 0, 5));
  });
});
