import { useScheduleStore } from '../../../store/useScheduleStore';
import { Toggle } from '../../ui/Toggle';

export function AppearanceSettings() {
  const darkMode = useScheduleStore((s) => s.darkMode);
  const toggleDarkMode = useScheduleStore((s) => s.toggleDarkMode);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Tema
        </h3>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <Toggle
            label="Modo oscuro"
            description="Cambia la interfaz a colores oscuros"
            checked={darkMode}
            onChange={toggleDarkMode}
          />
        </div>
      </div>
    </div>
  );
}
