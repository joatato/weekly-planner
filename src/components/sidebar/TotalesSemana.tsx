import { darkenColor } from '../../lib/blockUtils';
import { formatearHoras, useHorasPorTipo } from '../../store/selectors';

/**
 * Cuántas horas se lleva cada tipo en la semana visible.
 *
 * Es el resumen que el semanal no daba: se ve dónde va el tiempo sin contar
 * bloques a ojo. Cambia con la semana que estés mirando, no es un acumulado
 * histórico.
 */
export function TotalesSemana() {
  const totales = useHorasPorTipo();

  // Una semana vacía no necesita un cartel que diga que está vacía.
  if (totales.length === 0) return null;

  const totalSlots = totales.reduce((suma, t) => suma + t.slots, 0);

  return (
    <div data-bloque="calendar.totales">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Esta semana
        </h3>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {formatearHoras(totalSlots / 2)}
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {totales.map(({ type, slots, horas }) => (
          <li key={type.id} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm border"
              style={{ backgroundColor: type.color, borderColor: darkenColor(type.color, 0.18) }}
            />
            <span className="flex-1 truncate text-xs text-gray-600 dark:text-gray-300">
              {type.name}
            </span>
            {/* La barra da la proporción de un vistazo; el número da el dato.
                Va sobre una vía gris de ancho fijo: dibujando sólo el relleno,
                un tipo con una hora quedaba en un punto de 3 px que se leía
                como suciedad y no como "poquito de la semana". */}
            <span className="h-1.5 w-11 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <span
                className="block h-full rounded-full"
                style={{
                  backgroundColor: type.color,
                  width: `${Math.max(6, Math.round((slots / totalSlots) * 100))}%`,
                }}
              />
            </span>
            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {formatearHoras(horas)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
