import { useEffect } from 'react';
import { useScheduleStore } from './store/useScheduleStore';
import { AppShell } from './components/layout/AppShell';
import { SettingsPage } from './components/settings/SettingsPage';
import { PrintableWeek } from './components/print/PrintableWeek';

export default function App() {
  const darkMode = useScheduleStore((s) => s.darkMode);
  const currentView = useScheduleStore((s) => s.currentView);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <>
      {currentView === 'settings' ? <SettingsPage /> : <AppShell />}
      <PrintableWeek />
    </>
  );
}
