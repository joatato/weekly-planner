import { useScheduleStore } from '../../../store/useScheduleStore';
import { LINE_COLOR_PALETTE } from '../../../lib/constants';
import { Slider } from '../../ui/Slider';
import { ColorPicker } from '../../ui/ColorPicker';

export function PrintSettings() {
  const settings = useScheduleStore((s) => s.settings);
  const updateSetting = useScheduleStore((s) => s.updateSetting);

  return (
    <div data-bloque="settings.print" className="flex flex-col gap-6">
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Líneas de celda
        </h3>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <Slider
            label="Grosor de líneas"
            min={0.5}
            max={3}
            step={0.5}
            value={settings.printCellBorderWidth}
            onChange={(v) => updateSetting('printCellBorderWidth', v)}
            unit="px"
          />
          <div className="mt-4">
            <ColorPicker
              label="Tono de líneas"
              palette={LINE_COLOR_PALETTE}
              showCustom
              value={settings.printLineColor}
              onChange={(c) => updateSetting('printLineColor', c)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Etiquetas de horario
        </h3>
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <Slider
            label="Tamaño de texto (horas)"
            min={6}
            max={14}
            step={1}
            value={settings.printTimeFontSize}
            onChange={(v) => updateSetting('printTimeFontSize', v)}
            unit="px"
          />
          <Slider
            label="Tamaño de texto (bloques)"
            min={6}
            max={14}
            step={1}
            value={settings.printBlockFontSize}
            onChange={(v) => updateSetting('printBlockFontSize', v)}
            unit="px"
          />
        </div>
      </div>
    </div>
  );
}
