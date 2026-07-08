import { useStore } from 'zustand';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardPaste, Copy, Layers, Moon, Printer, Plus, Redo2, Settings, Sun, Undo2, Volume2, VolumeX } from 'lucide-react';
import { ProfileSwitcher } from './ProfileSwitcher';
import { useScheduleStore } from '../../store/useScheduleStore';
import { getWeekRangeLabel, getWeekNumber } from '../../lib/dateUtils';
import { usePrint } from '../../hooks/usePrint';
import { Button } from '../ui/Button';

export function Header() {
  const currentWeekKey = useScheduleStore((s) => s.currentWeekKey);
  const navigateWeek = useScheduleStore((s) => s.navigateWeek);
  const goToCurrentWeek = useScheduleStore((s) => s.goToCurrentWeek);
  const openModal = useScheduleStore((s) => s.openModal);
  const darkMode = useScheduleStore((s) => s.darkMode);
  const toggleDarkMode = useScheduleStore((s) => s.toggleDarkMode);
  const soundEnabled = useScheduleStore((s) => s.settings.soundEnabled);
  const updateSetting = useScheduleStore((s) => s.updateSetting);
  const navigateTo = useScheduleStore((s) => s.navigateTo);
  const copyWeek = useScheduleStore((s) => s.copyWeek);
  const pasteWeek = useScheduleStore((s) => s.pasteWeek);
  const hasClipboardWeek = useScheduleStore((s) => s.clipboardWeek !== null);
  const { undo, redo, pastStates, futureStates } = useStore(useScheduleStore.temporal);
  const print = usePrint();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <ProfileSwitcher />
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <CalendarDays size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none text-gray-900 dark:text-gray-50">
            Organizador Semanal
          </h1>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            Semana {getWeekNumber(currentWeekKey)} · {getWeekRangeLabel(currentWeekKey)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => navigateWeek('prev')}
            aria-label="Semana anterior"
            className="flex h-9 w-9 items-center justify-center rounded-l-lg text-gray-500 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToCurrentWeek}
            className="h-9 border-x border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Hoy
          </button>
          <button
            onClick={() => navigateWeek('next')}
            aria-label="Semana siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-r-lg text-gray-500 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <button
          onClick={() => updateSetting('soundEnabled', !soundEnabled)}
          aria-label={soundEnabled ? 'Silenciar' : 'Activar sonido'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>

        <button
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Modo claro' : 'Modo oscuro'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          onClick={() => undo()}
          disabled={pastStates.length === 0}
          title="Deshacer (Ctrl+Z)"
          aria-label="Deshacer"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <Undo2 size={17} />
        </button>

        <button
          onClick={() => redo()}
          disabled={futureStates.length === 0}
          title="Rehacer (Ctrl+Shift+Z)"
          aria-label="Rehacer"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <Redo2 size={17} />
        </button>

        <button
          onClick={copyWeek}
          title="Copiar semana (Ctrl+Shift+C)"
          aria-label="Copiar semana"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <Copy size={17} />
        </button>

        <button
          onClick={() => pasteWeek('replace')}
          disabled={!hasClipboardWeek}
          title="Pegar semana, reemplaza los bloques existentes (Ctrl+Shift+V)"
          aria-label="Pegar semana (reemplazar)"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <ClipboardPaste size={17} />
        </button>

        <button
          onClick={() => pasteWeek('merge')}
          disabled={!hasClipboardWeek}
          title="Pegar semana, combina con los bloques existentes (Ctrl+Shift+M)"
          aria-label="Pegar semana (combinar)"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <Layers size={17} />
        </button>

        <Button variant="secondary" size="md" onClick={print}>
          <Printer size={16} />
          <span className="hidden sm:inline">Exportar PDF</span>
        </Button>

        <Button variant="primary" size="md" onClick={() => openModal('createType')}>
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo tipo</span>
        </Button>

        <button
          onClick={() => navigateTo('settings')}
          aria-label="Ajustes"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
}
