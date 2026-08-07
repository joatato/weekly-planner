import { describe, expect, it } from 'vitest';
import { getWeekDates, getWeekKey, navigateWeekKey } from './dateUtils';

describe('getWeekKey', () => {
  it('genera la clave con el formato "YYYY-Www"', () => {
    // Lunes 5 de enero de 2026 → semana ISO 2 de 2026
    expect(getWeekKey(new Date(2026, 0, 5))).toBe('2026-W02');
  });

  it('un 31 de diciembre puede pertenecer a la semana ISO 1 del año siguiente', () => {
    expect(getWeekKey(new Date(2025, 11, 31))).toBe('2026-W01');
  });
});

describe('navigateWeekKey — cruce de año', () => {
  it('avanza desde la última semana ISO de diciembre a la primera semana ISO de enero', () => {
    // 2025 tiene 52 semanas ISO: la W52 es la última.
    expect(navigateWeekKey('2025-W52', 'next')).toBe('2026-W01');
  });

  it('retrocede desde la primera semana ISO de enero a la última semana ISO de diciembre', () => {
    expect(navigateWeekKey('2026-W01', 'prev')).toBe('2025-W52');
  });

  it('avanza correctamente cuando el año de origen tiene 53 semanas ISO', () => {
    // 2026 tiene 53 semanas ISO: la W53 es la última.
    expect(navigateWeekKey('2026-W53', 'next')).toBe('2027-W01');
  });

  it('retrocede correctamente hacia un año de 53 semanas ISO', () => {
    expect(navigateWeekKey('2027-W01', 'prev')).toBe('2026-W53');
  });
});

describe('getWeekDates', () => {
  it('devuelve 7 fechas consecutivas de lunes a domingo', () => {
    const dates = getWeekDates('2026-W23');
    expect(dates).toHaveLength(7);
    for (let i = 1; i < dates.length; i++) {
      const diffDays = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(1);
    }
  });

  it('una semana ISO puede empezar en el año calendario anterior', () => {
    // La semana ISO 2026-W01 arranca el lunes 29/12/2025.
    const [monday] = getWeekDates('2026-W01');
    expect(monday.getFullYear()).toBe(2025);
    expect(monday.getMonth()).toBe(11); // diciembre (0-based)
    expect(monday.getDate()).toBe(29);

    const sunday = getWeekDates('2026-W01')[6];
    expect(sunday.getFullYear()).toBe(2026);
    expect(sunday.getMonth()).toBe(0); // enero
    expect(sunday.getDate()).toBe(4);
  });
});
