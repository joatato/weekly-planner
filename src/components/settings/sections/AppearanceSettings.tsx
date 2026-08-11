import { useScheduleStore } from '../../../store/useScheduleStore';
import { useFullscreen } from '../../../hooks/useFullscreen';
import { reproducir } from '../../../lib/sonidos';
import { Toggle } from '../../ui/Toggle';

export function AppearanceSettings() {
  const darkMode = useScheduleStore((s) => s.darkMode);
  const toggleDarkMode = useScheduleStore((s) => s.toggleDarkMode);
  const fullscreenOnOpen = useScheduleStore((s) => s.settings.fullscreenOnOpen);
  const introAnimation = useScheduleStore((s) => s.settings.introAnimation);
  const soundEnabled = useScheduleStore((s) => s.settings.soundEnabled);
  const soundEffects = useScheduleStore((s) => s.settings.soundEffects);
  const updateSetting = useScheduleStore((s) => s.updateSetting);
  // En iPhone no existe la Fullscreen API. Mostrar el ajuste ahí sería ofrecer
  // algo que no hace nada: es peor que no ofrecerlo.
  const { isSupported: fullscreenSoportado } = useFullscreen();

  return (
    <div data-bloque="settings.appearance" className="flex flex-col gap-6">
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

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Al abrir
        </h3>
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          {fullscreenSoportado && (
            <Toggle
              label="Abrir en pantalla completa"
              description="Entra con tu primer toque: el navegador no deja hacerlo durante la carga"
              checked={fullscreenOnOpen}
              onChange={(v) => updateSetting('fullscreenOnOpen', v)}
            />
          )}
          <Toggle
            label="Animación de entrada"
            description="La app aparece con un movimiento breve al abrirse"
            checked={introAnimation}
            onChange={(v) => updateSetting('introAnimation', v)}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Sonido
        </h3>
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <Toggle
            label="Aviso de bloque"
            description="Suena cuando empieza un bloque de la grilla"
            checked={soundEnabled}
            onChange={(v) => updateSetting('soundEnabled', v)}
          />
          <Toggle
            label="Sonidos de la interfaz"
            description="Un sonido corto y una vibración al crear, mover, borrar y deshacer"
            checked={soundEffects}
            onChange={(v) => {
              updateSetting('soundEffects', v);
              // Al prenderlo suena una vez, para saber qué acabás de activar.
              // Va después del update: `reproducir` lee el ajuste del store.
              if (v) reproducir('crear');
            }}
          />
        </div>
      </div>
    </div>
  );
}
