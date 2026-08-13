import type { AppSettings, BlockType, ScheduleBlock, Seguimiento } from '../types';

/**
 * ¿Este bloque pide confirmación cada 30 min hasta que contestes que no?
 *
 * Cascada de tres niveles: el bloque puntual gana sobre su tipo, y el tipo gana
 * sobre el ajuste global. `'heredar'` (o el campo ausente) delega hacia arriba.
 *
 * La idea es configurarlo una vez por tipo —Estudio sí, Cena no— y poder hacer
 * la excepción en un bloque suelto sin tocar el tipo entero.
 */
export function resolverSeguimiento(
  block: Pick<ScheduleBlock, 'seguimiento'>,
  type: Pick<BlockType, 'seguimiento'> | undefined,
  settings: Pick<AppSettings, 'seguimientoGlobal'>,
): boolean {
  const delBloque = decidir(block.seguimiento);
  if (delBloque !== null) return delBloque;

  const delTipo = decidir(type?.seguimiento);
  if (delTipo !== null) return delTipo;

  return settings.seguimientoGlobal;
}

/** `null` = este nivel no decide, hay que preguntarle al de arriba. */
function decidir(valor: Seguimiento | undefined): boolean | null {
  if (valor === 'si') return true;
  if (valor === 'no') return false;
  return null;
}

/** Clave de `slotsRespondidos`. Un slot de un día concreto de una semana. */
export function claveSlot(weekKey: string, dayIndex: number, slot: number): string {
  return `${weekKey}:${dayIndex}:${slot}`;
}

/**
 * Slot siguiente al final de un bloque — el que le tocaría si sigue.
 * Un bloque que arranca en el 10 y dura 3 ocupa 10, 11 y 12; sigue en el 13.
 */
export function slotSiguiente(block: Pick<ScheduleBlock, 'startSlot' | 'duration'>): number {
  return block.startSlot + block.duration;
}
