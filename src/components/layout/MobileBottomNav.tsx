import { CalendarDays, Settings } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { cn } from '../../lib/cn';
import type { AppView } from '../../types';

interface MobileBottomNavProps {
  active: AppView;
}

/**
 * Barra de navegación inferior — sólo visible en móvil (md:hidden).
 * Reemplaza al botón de ajustes del header como forma principal de
 * cambiar entre semana y ajustes en pantallas chicas.
 */
export function MobileBottomNav({ active }: MobileBottomNavProps) {
  const navigateTo = useScheduleStore((s) => s.navigateTo);

  const itemClass = (isActive: boolean) =>
    cn(
      'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
      isActive
        ? 'text-indigo-600 dark:text-indigo-400'
        : 'text-gray-400 dark:text-gray-500',
    );

  return (
    <nav
      data-bloque="nav.movil"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 md:hidden"
    >
      <button onClick={() => navigateTo('calendar')} className={itemClass(active === 'calendar')}>
        <CalendarDays size={20} />
        Semana
      </button>
      <button onClick={() => navigateTo('settings')} className={itemClass(active === 'settings')}>
        <Settings size={20} />
        Ajustes
      </button>
    </nav>
  );
}
