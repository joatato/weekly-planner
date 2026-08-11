import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardPaste, Copy, Crosshair, Layers, Maximize, Menu, Minimize, MoreVertical, Moon, Printer, Plus, Redo2, Settings, Sun, Target, Undo2, Volume2, VolumeX } from 'lucide-react';
import { ProfileSwitcher } from './ProfileSwitcher';
import { AccountMenu } from './AccountMenu';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useEditorStore } from '../../store/useEditorStore';
import { getWeekRangeLabel, getWeekNumber } from '../../lib/dateUtils';
import { usePrint } from '../../hooks/usePrint';
import { useFullscreen } from '../../hooks/useFullscreen';
import { Button } from '../ui/Button';

interface HeaderProps {
  /** Abre el drawer de tipos de bloque — sólo relevante en móvil */
  onOpenSidebar?: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const currentWeekKey = useScheduleStore((s) => s.currentWeekKey);
  const navigateWeek = useScheduleStore((s) => s.navigateWeek);
  const goToToday = useScheduleStore((s) => s.goToToday);
  const openModal = useScheduleStore((s) => s.openModal);
  const darkMode = useScheduleStore((s) => s.darkMode);
  const toggleDarkMode = useScheduleStore((s) => s.toggleDarkMode);
  const soundEnabled = useScheduleStore((s) => s.settings.soundEnabled);
  const updateSetting = useScheduleStore((s) => s.updateSetting);
  const navigateTo = useScheduleStore((s) => s.navigateTo);
  const copyWeek = useScheduleStore((s) => s.copyWeek);
  const pasteWeek = useScheduleStore((s) => s.pasteWeek);
  const hasClipboardWeek = useScheduleStore((s) => s.clipboardWeek !== null);
  const editorActivo = useEditorStore((s) => s.activo);
  const alternarEditor = useEditorStore((s) => s.alternar);
  const { undo, redo, pastStates, futureStates } = useStore(useScheduleStore.temporal);
  const print = usePrint();
  const { isFullscreen, isSupported: isFullscreenSupported, toggle: toggleFullscreen } = useFullscreen();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // `pointerdown` y no `mousedown`: en táctil el mousedown sintético llega
    // recién después del touchend, y si el toque cae sobre un control que
    // frena el default, no llega nunca y el menú queda abierto.
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  const menuItemClass =
    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-800';

  return (
    <header
      data-bloque="calendar.header"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900 lg:px-5 lg:py-3"
    >
      <div className="flex min-w-0 items-center gap-2 lg:gap-3">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            aria-label="Abrir tipos de bloque"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden"
          >
            <Menu size={18} />
          </button>
        )}
        <ProfileSwitcher />
        <div className="hidden h-6 w-px bg-gray-200 dark:bg-gray-700 lg:block" />
        <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white lg:flex">
          <CalendarDays size={20} />
        </div>
        <div className="hidden min-w-0 lg:block">
          <h1 className="truncate text-lg font-bold leading-none text-gray-900 dark:text-gray-50">
            Organizador Semanal
          </h1>
          <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
            Semana {getWeekNumber(currentWeekKey)} · {getWeekRangeLabel(currentWeekKey)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AccountMenu />
        <div className="flex items-center rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => navigateWeek('prev')}
            aria-label="Semana anterior"
            className="flex h-9 w-9 items-center justify-center rounded-l-lg text-gray-500 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ChevronLeft size={18} />
          </button>
          {/* Abajo de `lg` va el ícono de diana: "Hoy" cuesta ~30 px de más y
              el header tiene que entrar en una fila a 390. El aria-label lo
              deja entendible para quien no ve el botón. */}
          <button
            onClick={goToToday}
            aria-label="Ir a hoy"
            className="flex h-9 w-9 items-center justify-center border-x border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 lg:w-auto lg:px-3"
          >
            <Target size={17} className="lg:hidden" />
            <span className="hidden lg:inline">Hoy</span>
          </button>
          <button
            onClick={() => navigateWeek('next')}
            aria-label="Semana siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-r-lg text-gray-500 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Fila completa de acciones — sólo escritorio.
            El corte es `lg` y no `md`: esta fila mide ~610 px y, sumada al
            grupo de la izquierda, desbordaba la pantalla en el iPhone
            apaisado (844 px) y en el iPad vertical (768 px), haciendo que la
            página entera scrollee en horizontal. */}
        <div className="hidden items-center gap-2 lg:flex">
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

          {isFullscreenSupported && (
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
            </button>
          )}

          <button
            onClick={() => navigateTo('settings')}
            aria-label="Ajustes"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <Settings size={17} />
          </button>
        </div>

        {/* Menú kebab — sólo móvil, agrupa las acciones secundarias */}
        <div className="relative lg:hidden" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Más acciones"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => { updateSetting('soundEnabled', !soundEnabled); setMenuOpen(false); }}
                className={menuItemClass}
              >
                {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
                {soundEnabled ? 'Silenciar' : 'Activar sonido'}
              </button>
              <button onClick={() => { toggleDarkMode(); setMenuOpen(false); }} className={menuItemClass}>
                {darkMode ? <Sun size={17} /> : <Moon size={17} />}
                {darkMode ? 'Modo claro' : 'Modo oscuro'}
              </button>
              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
              <button
                onClick={() => { undo(); setMenuOpen(false); }}
                disabled={pastStates.length === 0}
                className={menuItemClass}
              >
                <Undo2 size={17} />
                Deshacer
              </button>
              <button
                onClick={() => { redo(); setMenuOpen(false); }}
                disabled={futureStates.length === 0}
                className={menuItemClass}
              >
                <Redo2 size={17} />
                Rehacer
              </button>
              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
              <button onClick={() => { copyWeek(); setMenuOpen(false); }} className={menuItemClass}>
                <Copy size={17} />
                Copiar semana
              </button>
              <button
                onClick={() => { pasteWeek('replace'); setMenuOpen(false); }}
                disabled={!hasClipboardWeek}
                className={menuItemClass}
              >
                <ClipboardPaste size={17} />
                Pegar semana (reemplazar)
              </button>
              <button
                onClick={() => { pasteWeek('merge'); setMenuOpen(false); }}
                disabled={!hasClipboardWeek}
                className={menuItemClass}
              >
                <Layers size={17} />
                Pegar semana (combinar)
              </button>
              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
              <button onClick={() => { print(); setMenuOpen(false); }} className={menuItemClass}>
                <Printer size={17} />
                Exportar PDF
              </button>
              <button onClick={() => { openModal('createType'); setMenuOpen(false); }} className={menuItemClass}>
                <Plus size={17} />
                Nuevo tipo
              </button>
              {isFullscreenSupported && (
                <>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                  <button onClick={() => { toggleFullscreen(); setMenuOpen(false); }} className={menuItemClass}>
                    {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
                    {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  </button>
                </>
              )}

              {/* El modo editor sólo se prendía con Ctrl+Shift+E, que en un
                  teléfono no existe. Este es su único acceso en táctil. */}
              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
              <button
                onClick={() => { alternarEditor(); setMenuOpen(false); }}
                className={menuItemClass}
              >
                <Crosshair size={17} className={editorActivo ? 'text-indigo-500' : ''} />
                {editorActivo ? 'Salir del modo editor' : 'Modo editor'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
