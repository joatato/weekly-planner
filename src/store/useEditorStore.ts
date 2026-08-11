// Store aparte para el modo editor — a propósito NO vive dentro de
// useScheduleStore. Ese store está envuelto en `temporal` (zundo) y
// `persist`: si `activo` viviera ahí, prender/apagar el modo editor entraría
// al historial de deshacer/rehacer (un Ctrl+Z apagaría el editor) y se
// guardaría en localStorage mezclado con los datos reales del usuario
// (bloques, tipos). Un store propio evita las dos cosas.
//
// Tampoco se persiste por su cuenta. Antes sí, tratando `activo` como una
// preferencia; no lo es. Es una herramienta que se prende para anotar algo
// puntual, y persistirla hacía que la app abriera adentro del modo editor,
// con el overlay puesto, hasta que uno se acordaba de apagarlo.

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/** Limpieza de la versión que sí persistía. Sin esto la clave queda dando
 *  vueltas en el navegador de todo el que ya usó el modo editor. */
try {
  localStorage.removeItem('weekly-planner-editor');
} catch {
  // localStorage puede no existir (SSR) o estar bloqueado. No importa.
}

interface EditorStore {
  /** Modo editor prendido. Efímero: cada sesión arranca apagado. */
  activo: boolean;
  /** "Anotar esto" de un solo uso (flujo táctil). */
  armado: boolean;

  alternar: () => void;
  poner: (v: boolean) => void;
  /** Prende/apaga `armado`. Seleccionar un elemento lo vuelve a false. */
  armar: (v: boolean) => void;
}

export const useEditorStore = create<EditorStore>()(
  immer((set) => ({
    activo: false,
    armado: false,

    alternar: () =>
      set((state) => {
        state.activo = !state.activo;
      }),
    poner: (v) =>
      set((state) => {
        state.activo = v;
      }),
    armar: (v) =>
      set((state) => {
        state.armado = v;
      }),
  })),
);
