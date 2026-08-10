import { describe, expect, it } from 'vitest';
import { ordenSaneado, sinIndefinidos } from './sync';

describe('sinIndefinidos', () => {
  it('saca las claves con undefined — Firestore las rechaza', () => {
    expect(sinIndefinidos({ a: 1, b: undefined, c: 'x' })).toEqual({ a: 1, c: 'x' });
  });

  it('deja pasar null, 0, cadena vacía y false', () => {
    expect(sinIndefinidos({ a: null, b: 0, c: '', d: false })).toEqual({
      a: null,
      b: 0,
      c: '',
      d: false,
    });
  });

  it('un bloque sin note ni recurringId queda sin esas claves', () => {
    const doc = sinIndefinidos({
      typeId: 't1',
      weekKey: '2026-W32',
      dayIndex: 0,
      startSlot: 4,
      duration: 2,
      note: undefined,
      recurringId: undefined,
      updatedAt: 1,
    });
    expect(Object.keys(doc).sort()).toEqual([
      'dayIndex',
      'duration',
      'startSlot',
      'typeId',
      'updatedAt',
      'weekKey',
    ]);
  });
});

describe('ordenSaneado', () => {
  it('agrega al final los tipos que bajaron de la nube sin entrada en el orden', () => {
    expect(ordenSaneado(['a', 'b', 'c'], ['a', 'b'])).toEqual(['a', 'b', 'c']);
  });

  it('saca del orden los tipos que ya no existen', () => {
    expect(ordenSaneado(['a', 'c'], ['a', 'b', 'c'])).toEqual(['a', 'c']);
  });

  it('respeta el orden existente', () => {
    expect(ordenSaneado(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual(['c', 'a', 'b']);
  });

  it('quita duplicados', () => {
    expect(ordenSaneado(['a', 'b'], ['a', 'a', 'b'])).toEqual(['a', 'b']);
  });

  it('con el orden vacío devuelve todos los tipos', () => {
    expect(ordenSaneado(['a', 'b'], []).sort()).toEqual(['a', 'b']);
  });

  it('sin tipos devuelve una lista vacía', () => {
    expect(ordenSaneado([], ['a', 'b'])).toEqual([]);
  });
});
