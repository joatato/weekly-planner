import {
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
  addWeeks,
  addDays,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';

/** Genera la clave ISO de semana para una fecha: "2026-W23" */
export function getWeekKey(date: Date): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
}

export function getCurrentWeekKey(): string {
  return getWeekKey(new Date());
}

/** Devuelve el lunes (Date) de una clave de semana dada */
export function getMondayFromWeekKey(weekKey: string): Date {
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  // El 4 de enero siempre pertenece a la semana ISO 1
  const jan4 = new Date(year, 0, 4);
  const week1Monday = startOfISOWeek(jan4);
  return addWeeks(week1Monday, week - 1);
}

/** Devuelve un array de 7 Date [Lun..Dom] para una clave de semana */
export function getWeekDates(weekKey: string): Date[] {
  const monday = getMondayFromWeekKey(weekKey);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Navega a la semana anterior o siguiente y devuelve su clave */
export function navigateWeekKey(weekKey: string, direction: 'prev' | 'next'): string {
  const monday = getMondayFromWeekKey(weekKey);
  const newMonday = addWeeks(monday, direction === 'next' ? 1 : -1);
  return getWeekKey(newMonday);
}

/** Etiqueta legible del rango de la semana, ej. "20 – 26 jun 2026" */
export function getWeekRangeLabel(weekKey: string): string {
  const dates = getWeekDates(weekKey);
  const first = dates[0];
  const last = dates[6];
  const sameMonth = first.getMonth() === last.getMonth();
  const sameYear = first.getFullYear() === last.getFullYear();

  if (sameMonth) {
    return `${format(first, 'd', { locale: es })} – ${format(last, "d 'de' MMMM yyyy", { locale: es })}`;
  }
  if (sameYear) {
    return `${format(first, 'd MMM', { locale: es })} – ${format(last, 'd MMM yyyy', { locale: es })}`;
  }
  return `${format(first, 'd MMM yyyy', { locale: es })} – ${format(last, 'd MMM yyyy', { locale: es })}`;
}

/** Número de semana ISO (para mostrar "Semana 23") */
export function getWeekNumber(weekKey: string): number {
  return Number(weekKey.split('-W')[1]);
}

/** Formatea hora y minuto según el formato elegido (24h o 12h AM/PM) */
export function formatTimeLabel(hour: number, minute: 0 | 30, format: '24h' | '12h'): string {
  if (format === '24h') {
    return `${String(hour).padStart(2, '0')}:${minute === 0 ? '00' : '30'}`;
  }
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${minute === 0 ? '00' : '30'} ${ampm}`;
}
