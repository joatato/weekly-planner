import { describe, expect, it } from 'vitest';
import { formatearHoras } from './selectors';

describe('formatearHoras', () => {
  it('una hora justa no muestra los minutos', () => {
    expect(formatearHoras(18)).toBe('18 h');
    expect(formatearHoras(1)).toBe('1 h');
  });

  it('media hora se muestra en minutos, sin un "0 h" adelante', () => {
    expect(formatearHoras(0.5)).toBe('30 min');
  });

  it('horas con media', () => {
    expect(formatearHoras(2.5)).toBe('2 h 30');
  });

  it('cero', () => {
    expect(formatearHoras(0)).toBe('0 min');
  });

  it('no arrastra decimales de coma flotante', () => {
    // 0.1 + 0.2 === 0.30000000000000004; con slots/2 no debería pasar nunca,
    // pero el formateo tiene que aguantarlo igual.
    expect(formatearHoras(0.1 + 0.2)).toBe('18 min');
    expect(formatearHoras(7.5)).toBe('7 h 30');
  });
});
