import { Columns2, Layers } from 'lucide-react';
import type { CapaVisible, EstiloAmbos } from '../../types';
import { useScheduleStore } from '../../store/useScheduleStore';
import { cn } from '../../lib/cn';

const CAPAS: { valor: CapaVisible; etiqueta: string; ayuda: string }[] = [
  { valor: 'plan', etiqueta: 'Plan', ayuda: 'Lo que querés hacer' },
  { valor: 'real', etiqueta: 'Real', ayuda: 'Lo que realmente hiciste' },
  { valor: 'ambos', etiqueta: 'Ambos', ayuda: 'Las dos capas juntas' },
];

const ESTILOS: { valor: EstiloAmbos; Icono: typeof Columns2; ayuda: string }[] = [
  { valor: 'lado', Icono: Columns2, ayuda: 'Lado a lado' },
  { valor: 'superpuesto', Icono: Layers, ayuda: 'Superpuesto' },
];

/**
 * Elige qué capa muestra la grilla. Vive acá y no en el header porque el header
 * está ajustado para entrar en una sola fila a 390 px, y tres botones más lo
 * rompen justo en el teléfono.
 */
export function SelectorCapa() {
  const capaVisible = useScheduleStore((s) => s.settings.capaVisible);
  const estiloAmbos = useScheduleStore((s) => s.settings.estiloAmbos);
  const updateSetting = useScheduleStore((s) => s.updateSetting);

  return (
    <div
      data-bloque="calendar.selector-capa"
      className="mb-2 flex items-center gap-2"
    >
      <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {CAPAS.map(({ valor, etiqueta, ayuda }) => (
          <button
            key={valor}
            onClick={() => updateSetting('capaVisible', valor)}
            title={ayuda}
            aria-pressed={capaVisible === valor}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              capaVisible === valor
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700',
            )}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {capaVisible === 'ambos' && (
        <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {ESTILOS.map(({ valor, Icono, ayuda }) => (
            <button
              key={valor}
              onClick={() => updateSetting('estiloAmbos', valor)}
              title={ayuda}
              aria-label={ayuda}
              aria-pressed={estiloAmbos === valor}
              className={cn(
                'flex h-7 w-8 items-center justify-center rounded-md transition-colors',
                estiloAmbos === valor
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                  : 'text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-700',
              )}
            >
              <Icono size={15} />
            </button>
          ))}
        </div>
      )}

      {capaVisible === 'real' && (
        <span className="truncate text-xs text-gray-400 dark:text-gray-500">
          Lo que confirmaste
        </span>
      )}
    </div>
  );
}
