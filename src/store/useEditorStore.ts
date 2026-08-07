// Store aparte para el modo editor — a propósito NO vive dentro de
// useScheduleStore. Ese store está envuelto en `temporal` (zundo) y
// `persist`: si `activo` viviera ahí, prender/apagar el modo editor entraría
// al historial de deshacer/rehacer (un Ctrl+Z apagaría el editor) y se
// guardaría en localStorage mezclado con los datos reales del usuario
// (bloques, tipos). Un store propio evita las dos cosas.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface EditorStore {
  /** Modo editor prendido. Se persiste: es una preferencia del usuario. */
  activo: boolean;
  /** "Anotar esto" de un solo uso (flujo táctil). Efímero: no se persiste. */
  armado: boolean;

  alternar: () => void;
  poner: (v: boolean) => void;
  /** Prende/apaga `armado`. Seleccionar un elemento lo vuelve a false. */
  armar: (v: boolean) => void;
}

export const useEditorStore = create<EditorStore>()(
  persist(
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
    {
      name: 'weekly-planner-editor',
      storage: createJSONStorage(() => localStorage),
      // `armado` es efímero: no tiene sentido conservarlo entre recargas.
      partialize: (state) => ({ activo: state.activo }) as EditorStore,
    },
  ),
);
