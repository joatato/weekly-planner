import { useScheduleStore } from '../../../store/useScheduleStore';
import { Slider } from '../../ui/Slider';
import { Toggle } from '../../ui/Toggle';
import { START_HOUR } from '../../../lib/constants';

const HOUR_OPTIONS = Array.from(
  { length: 23 - START_HOUR + 1 },
  (_, i) => START_HOUR + i,
);

function HourSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (h: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      >
        {options.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, '0')}:00
          </option>
        ))}
      </select>
    </div>
  );
}

export function GridSettings() {
  const settings = useScheduleStore((s) => s.settings);
  const updateSetting = useScheduleStore((s) => s.updateSetting);

  const startOptions = HOUR_OPTIONS.slice(0, -1); // 6..22
  const endOptions = HOUR_OPTIONS.slice(1);       // 7..23

  return (
    <div className="flex flex-col gap-6">
      {/* Rango horario visible */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Rango horario visible
        </h3>
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <HourSelect
            label="Desde"
            value={settings.visibleStartHour}
            options={startOptions.filter((h) => h < settings.visibleEndHour)}
            onChange={(h) => updateSetting('visibleStartHour', h)}
          />
          <HourSelect
            label="Hasta"
            value={settings.visibleEndHour}
            options={endOptions.filter((h) => h > settings.visibleStartHour)}
            onChange={(h) => updateSetting('visibleEndHour', h)}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {(settings.visibleEndHour - settings.visibleStartHour)} horas visibles ·{' '}
            {(settings.visibleEndHour - settings.visibleStartHour) * 2} slots
          </p>
        </div>
      </div>

      {/* Formato de hora */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Formato de hora
        </h3>
        <div className="flex gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          {(['24h', '12h'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => updateSetting('hourFormat', fmt)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                settings.hourFormat === fmt
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              {fmt === '24h' ? '24 h  (14:30)' : '12 h  (2:30 PM)'}
            </button>
          ))}
        </div>
      </div>

      {/* Altura de slots */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Altura de filas en pantalla
        </h3>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <Slider
            label="Alto por slot (30 min)"
            min={20}
            max={50}
            step={2}
            value={settings.slotHeightPx}
            onChange={(v) => updateSetting('slotHeightPx', v)}
            unit="px"
          />
        </div>
      </div>

      {/* Fines de semana */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Días visibles
        </h3>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <Toggle
            label="Mostrar fines de semana"
            description="Sábado y Domingo"
            checked={settings.showWeekends}
            onChange={(v) => updateSetting('showWeekends', v)}
          />
        </div>
      </div>
    </div>
  );
}
