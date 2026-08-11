// Entra en pantalla completa "al abrir", con la salvedad que impone el
// navegador: `requestFullscreen` exige un gesto del usuario y rechaza la
// llamada durante la carga. Lo más cerca de "al abrir" que existe es el primer
// toque, y eso es lo que hace esto.
//
// En iPhone no aplica: no hay Fullscreen API (`isSupported` da false) y el
// único pantalla completa real es la PWA instalada en modo standalone.

import { useEffect } from 'react';

interface Opciones {
  activo: boolean;
  soportado: boolean;
  /** Entra y no hace nada si ya está adentro — no un toggle. */
  entrar: () => void;
}

export function useFullscreenAlAbrir({ activo, soportado, entrar }: Opciones): void {
  useEffect(() => {
    if (!activo || !soportado) return;

    // Es "al abrir", no "cada vez que toco": se arma una sola vez. Si la
    // persona sale de pantalla completa después, no la volvemos a meter.
    let usado = false;
    const alGesto = () => {
      if (usado) return;
      usado = true;
      entrar();
    };

    const opciones = { once: true, capture: true } as const;
    document.addEventListener('pointerdown', alGesto, opciones);
    document.addEventListener('keydown', alGesto, opciones);
    return () => {
      document.removeEventListener('pointerdown', alGesto, true);
      document.removeEventListener('keydown', alGesto, true);
    };
  }, [activo, soportado, entrar]);
}
