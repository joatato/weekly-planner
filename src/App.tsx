import { useEffect } from 'react';
import { useScheduleStore } from './store/useScheduleStore';
import { AppShell } from './components/layout/AppShell';
import { SettingsPage } from './components/settings/SettingsPage';
import { PrintableWeek } from './components/print/PrintableWeek';
import { ModoEditor } from './components/editor/ModoEditor';
import { AvisoActualizacion } from './components/layout/AvisoActualizacion';

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
      {/* A nivel de App, que devuelve un Fragment: adentro de un Modal el
          backdrop-blur crea un containing block y el `position: fixed` del
          recuadro deja de funcionar. */}
      <ModoEditor />
      <AvisoActualizacion />
    </>
  );
}
