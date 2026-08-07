import { useState } from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { MobileBottomNav } from '../layout/MobileBottomNav';
import { SettingsNav, type SettingsSection } from './SettingsNav';
import { AppearanceSettings } from './sections/AppearanceSettings';
import { GridSettings } from './sections/GridSettings';
import { PrintSettings } from './sections/PrintSettings';

const SECTION_TITLES: Record<SettingsSection, string> = {
  appearance: 'Apariencia',
  grid: 'Grilla',
  print: 'Impresión',
};

export function SettingsPage() {
  const navigateTo = useScheduleStore((s) => s.navigateTo);
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

  return (
    <div className="flex h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header
        data-bloque="settings.header"
        className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-900"
      >
        <button
          onClick={() => navigateTo('calendar')}
          aria-label="Volver al calendario"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-gray-400 dark:text-gray-500" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Ajustes</h1>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <SettingsNav active={activeSection} onChange={setActiveSection} />

        <main className="flex-1 overflow-y-auto p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
          <h2 className="mb-5 text-xl font-semibold text-gray-900 dark:text-gray-50">
            {SECTION_TITLES[activeSection]}
          </h2>
          <div className="max-w-lg">
            {activeSection === 'appearance' && <AppearanceSettings />}
            {activeSection === 'grid' && <GridSettings />}
            {activeSection === 'print' && <PrintSettings />}
          </div>
        </main>
      </div>

      <MobileBottomNav active="settings" />
    </div>
  );
}
