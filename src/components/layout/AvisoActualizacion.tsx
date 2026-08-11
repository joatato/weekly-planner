// Avisa cuando hay una versión nueva esperando, y la aplica al tocar.
//
// Existe porque sin esto el celular podía quedarse con un bundle viejo sin que
// nada lo dijera: el service worker sirve lo cacheado, y en iOS la PWA instalada
// recién busca una versión nueva al reabrirla, a veces dos veces. Desde afuera
// eso se ve como "el cambio no llegó", no como "hay que recargar".

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Cada cuánto preguntarle al servidor si hay una versión nueva. */
const CADA_HORA = 60 * 60 * 1000;

export function AvisoActualizacion() {
  // El registro se guarda en estado y los listeners van en un efecto aparte:
  // `onRegisteredSW` ignora lo que devuelva, así que un cleanup devuelto desde
  // ahí no corre nunca y los listeners quedarían colgados.
  const [registro, setRegistro] = useState<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, r) => setRegistro(r ?? null),
  });

  // El navegador chequea por su cuenta, pero muy de vez en cuando. Estos dos
  // son los que hacen que la versión nueva aparezca sin intervención.
  useEffect(() => {
    if (!registro) return;

    const chequear = () => {
      if (document.visibilityState === 'visible') void registro.update();
    };

    // El que más rinde en el teléfono: volver a la app después de un rato es
    // justo cuando suele haber algo nuevo esperando.
    document.addEventListener('visibilitychange', chequear);
    const timer = setInterval(chequear, CADA_HORA);
    return () => {
      document.removeEventListener('visibilitychange', chequear);
      clearInterval(timer);
    };
  }, [registro]);

  if (!hayVersionNueva) return null;

  return (
    <div
      data-bloque="app.actualizacion"
      className="fixed inset-x-3 bottom-20 z-[60] flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-gray-800 md:inset-x-auto md:bottom-4 md:left-4"
    >
      <RefreshCw size={16} className="shrink-0 text-indigo-400" />
      <span className="flex-1">Hay una versión nueva</span>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-indigo-700"
      >
        Actualizar
      </button>
      <button
        type="button"
        onClick={() => setHayVersionNueva(false)}
        className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        Después
      </button>
    </div>
  );
}
