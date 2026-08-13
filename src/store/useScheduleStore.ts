import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';

import type {
  AppSettings,
  AppView,
  Aviso,
  BlockType,
  ScheduleBlock,
  ClipboardBlock,
  ModalKind,
  ModalContext,
  PersistedState,
  RespuestaAlarma,
} from '../types';
import { DEFAULT_BLOCK_TYPES, DEFAULT_SETTINGS } from '../lib/constants';
import { claveSlot, resolverSeguimiento, slotSiguiente } from '../lib/seguimiento';
import { getActiveProfileId } from '../lib/profiles';
import { getCurrentWeekKey, navigateWeekKey } from '../lib/dateUtils';
import { clampBlock } from '../lib/blockUtils';

/** Índice de hoy en la grilla, que arranca en lunes. `getDay()` cuenta desde
 *  el domingo, de ahí el corrimiento. */
function diaDeHoy(): number {
  return (new Date().getDay() + 6) % 7;
}

function diasVisibles(state: { settings: AppSettings }): number {
  return state.settings.showWeekends ? 7 : 5;
}

/** El aviso se arma dentro del mismo `set` que la acción que lo provoca, para
 *  que lo que se muestra y lo que zundo va a revertir sean el mismo evento. */
function avisar(texto: string, deshacer = true): Aviso {
  return { id: nanoid(), texto, deshacer };
}

interface ScheduleStore extends PersistedState {
  // ---- Estado de navegación / UI (no persistido) ----
  currentWeekKey: string;
  currentView: AppView;
  /** Día que se ve en la vista móvil de un solo día. Vive acá y no en
   *  `WeekGrid` porque el botón "Hoy" del header tiene que poder moverlo. */
  mobileDayIndex: number;
  selectedBlockIds: string[];
  clipboardSelection: ClipboardBlock[] | null;
  clipboardWeek: ClipboardBlock[] | null;
  activeModal: ModalKind | null;
  modalContext: ModalContext | null;
  /** Aviso al pie. Efímero: no entra ni en el historial de zundo ni en
   *  localStorage — las dos `partialize` son listas explícitas. */
  aviso: Aviso | null;

  // ---- Navegación ----
  navigateWeek: (direction: 'prev' | 'next') => void;
  goToCurrentWeek: () => void;
  goToToday: () => void;
  /** Mueve un día en la vista móvil, cruzando de semana en los bordes. */
  moverDia: (delta: 1 | -1) => void;
  setWeekKey: (weekKey: string) => void;

  // ---- CRUD de bloques ----
  addBlock: (block: Omit<ScheduleBlock, 'id'>) => string;
  addBlocks: (blocks: Omit<ScheduleBlock, 'id'>[]) => void;
  updateBlock: (id: string, patch: Partial<ScheduleBlock>) => void;
  deleteBlock: (id: string) => void;
  moveBlock: (id: string, dayIndex: number, startSlot: number) => void;
  moveSelectedBlocks: (draggedId: string, dayIndex: number, startSlot: number) => void;
  resizeBlock: (id: string, duration: number) => void;
  deleteSelectedBlocks: () => void;

  // ---- Capa de registro ----
  /**
   * Contesta la alarma de un bloque de plan para un slot concreto.
   * Escribe en la capa real; el bloque de plan no se toca nunca.
   */
  responderAlarma: (planId: string, slot: number, respuesta: RespuestaAlarma) => void;
  /** Registra un bloque de plan entero como hecho, sin esperar a la alarma. */
  confirmarPlanEntero: (planId: string) => void;
  /**
   * Cierra los registros abiertos que ya no pueden continuar.
   * Es lo que hace cumplir "el registro nunca inventa tiempo que no
   * confirmaste": si la app estuvo cerrada, el bloque queda con la duración que
   * alcanzó a confirmarse y no se estira hasta ahora.
   */
  cerrarRegistrosVencidos: (weekKey: string, dayIndex: number, slotActual: number) => void;

  // ---- CRUD de tipos ----
  addBlockType: (type: Omit<BlockType, 'id'>) => string;
  updateBlockType: (id: string, patch: Partial<BlockType>) => void;
  deleteBlockType: (id: string) => void;

  // ---- Copiar / Pegar ----
  copySelectedBlocks: () => void;
  pasteSelectedBlocks: () => void;
  copyWeek: () => void;
  pasteWeek: (mode: 'replace' | 'merge') => void;

  // ---- Modales / selección ----
  openModal: (kind: ModalKind, context?: ModalContext) => void;
  closeModal: () => void;
  setSelectedBlock: (id: string | null) => void;
  toggleSelectedBlock: (id: string) => void;

  // ---- Avisos ----
  mostrarAviso: (texto: string, deshacer?: boolean) => void;
  ocultarAviso: () => void;

  // ---- Mantenimiento ----
  clearWeek: (weekKey: string) => void;

  // ---- Tema ----
  toggleDarkMode: () => void;

  // ---- Ajustes ----
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  navigateTo: (view: AppView) => void;
}

const initialBlockTypes: Record<string, BlockType> = Object.fromEntries(
  DEFAULT_BLOCK_TYPES.map((t) => [t.id, t]),
);

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    temporal(
      immer((set, get) => ({
      // ---- Estado inicial ----
      blockTypes: initialBlockTypes,
      blocks: {},
      blockTypeOrder: DEFAULT_BLOCK_TYPES.map((t) => t.id),
      darkMode: false,
      settings: DEFAULT_SETTINGS,
      slotsRespondidos: {},

      currentWeekKey: getCurrentWeekKey(),
      currentView: 'calendar' as AppView,
      mobileDayIndex: diaDeHoy(),
      selectedBlockIds: [],
      clipboardSelection: null,
      clipboardWeek: null,
      activeModal: null,
      modalContext: null,
      aviso: null,

      // ---- Navegación ----
      navigateWeek: (direction) =>
        set((state) => {
          state.currentWeekKey = navigateWeekKey(state.currentWeekKey, direction);
          state.selectedBlockIds = [];
        }),
      goToCurrentWeek: () =>
        set((state) => {
          state.currentWeekKey = getCurrentWeekKey();
          state.selectedBlockIds = [];
        }),
      // "Hoy" lleva al día de hoy, no sólo a la semana: en la vista móvil, que
      // muestra un día solo, caer en el lunes de la semana actual no es llegar.
      goToToday: () =>
        set((state) => {
          state.currentWeekKey = getCurrentWeekKey();
          state.mobileDayIndex = Math.min(diaDeHoy(), diasVisibles(state) - 1);
          state.selectedBlockIds = [];
        }),
      // Sólo ±1: es lo que mandan las flechas y el swipe. Al pasarse de un
      // borde cambia de semana y entra por el otro lado, así se puede correr
      // de a un día todo lo que haga falta sin frenarse en el domingo.
      moverDia: (delta) =>
        set((state) => {
          const cuantos = diasVisibles(state);
          const destino = state.mobileDayIndex + delta;
          if (destino < 0) {
            state.currentWeekKey = navigateWeekKey(state.currentWeekKey, 'prev');
            state.mobileDayIndex = cuantos - 1;
          } else if (destino >= cuantos) {
            state.currentWeekKey = navigateWeekKey(state.currentWeekKey, 'next');
            state.mobileDayIndex = 0;
          } else {
            state.mobileDayIndex = destino;
          }
          state.selectedBlockIds = [];
        }),
      setWeekKey: (weekKey) =>
        set((state) => {
          state.currentWeekKey = weekKey;
          state.selectedBlockIds = [];
        }),

      // ---- CRUD de bloques ----
      addBlock: (block) => {
        const id = nanoid();
        const { startSlot, duration } = clampBlock(block.startSlot, block.duration);
        set((state) => {
          state.blocks[id] = { ...block, id, startSlot, duration };
        });
        return id;
      },
      addBlocks: (blocks) =>
        set((state) => {
          for (const block of blocks) {
            const id = nanoid();
            const { startSlot, duration } = clampBlock(block.startSlot, block.duration);
            state.blocks[id] = { ...block, id, startSlot, duration };
          }
        }),
      updateBlock: (id, patch) =>
        set((state) => {
          const b = state.blocks[id];
          if (!b) return;
          Object.assign(b, patch);
          const { startSlot, duration } = clampBlock(b.startSlot, b.duration);
          b.startSlot = startSlot;
          b.duration = duration;
        }),
      deleteBlock: (id) =>
        set((state) => {
          if (!state.blocks[id]) return;
          delete state.blocks[id];
          state.selectedBlockIds = state.selectedBlockIds.filter((x) => x !== id);
          state.aviso = avisar('Bloque borrado');
        }),
      moveBlock: (id, dayIndex, startSlot) =>
        set((state) => {
          const b = state.blocks[id];
          if (!b) return;
          b.dayIndex = dayIndex;
          const clamped = clampBlock(startSlot, b.duration);
          b.startSlot = clamped.startSlot;
          b.duration = clamped.duration;
          b.weekKey = state.currentWeekKey;
        }),
      moveSelectedBlocks: (draggedId, dayIndex, startSlot) =>
        set((state) => {
          const dragged = state.blocks[draggedId];
          if (!dragged) return;
          const clampedDragged = clampBlock(startSlot, dragged.duration);
          const dayDelta = dayIndex - dragged.dayIndex;
          const slotDelta = clampedDragged.startSlot - dragged.startSlot;

          const idsToMove = state.selectedBlockIds.includes(draggedId)
            ? state.selectedBlockIds
            : [draggedId];

          for (const id of idsToMove) {
            const b = state.blocks[id];
            if (!b) continue;
            b.dayIndex = Math.max(0, Math.min(6, b.dayIndex + dayDelta));
            const clamped = clampBlock(b.startSlot + slotDelta, b.duration);
            b.startSlot = clamped.startSlot;
            b.duration = clamped.duration;
            b.weekKey = state.currentWeekKey;
          }
        }),
      deleteSelectedBlocks: () =>
        set((state) => {
          const cuantos = state.selectedBlockIds.length;
          if (cuantos === 0) return;
          for (const id of state.selectedBlockIds) {
            delete state.blocks[id];
          }
          state.selectedBlockIds = [];
          state.aviso = avisar(cuantos === 1 ? 'Bloque borrado' : `${cuantos} bloques borrados`);
        }),
      resizeBlock: (id, duration) =>
        set((state) => {
          const b = state.blocks[id];
          if (!b) return;
          const clamped = clampBlock(b.startSlot, duration);
          b.duration = clamped.duration;
        }),

      // ---- Capa de registro ----
      responderAlarma: (planId, slot, respuesta) =>
        set((state) => {
          const plan = state.blocks[planId];
          if (!plan) return;
          const { weekKey, dayIndex } = plan;
          state.slotsRespondidos[claveSlot(weekKey, dayIndex, slot)] = true;

          const abiertos = Object.values(state.blocks).filter(
            (b) =>
              b.capa === 'real' && b.abierto && b.weekKey === weekKey && b.dayIndex === dayIndex,
          );

          if (respuesta.tipo === 'nada') {
            for (const a of abiertos) a.abierto = false;
            return;
          }

          const typeId = respuesta.tipo === 'otro' ? respuesta.typeId : plan.typeId;
          // El seguimiento sale del bloque de PLAN aunque estés haciendo otra
          // cosa: lo que decidiste seguir de cerca es esa franja de tiempo.
          const sigue = resolverSeguimiento(plan, state.blockTypes[plan.typeId], state.settings);

          // Sólo continúa el registro que termina justo donde empieza este
          // slot. Si hay un hueco, es tiempo que no confirmaste: se cierra y
          // arranca uno nuevo en vez de estirar el anterior por arriba.
          const continuable = abiertos.find(
            (a) => a.typeId === typeId && slotSiguiente(a) === slot,
          );
          for (const a of abiertos) {
            if (a !== continuable) a.abierto = false;
          }

          if (continuable) {
            continuable.duration = clampBlock(
              continuable.startSlot,
              continuable.duration + 1,
            ).duration;
            continuable.abierto = sigue;
            return;
          }

          const id = nanoid();
          const { startSlot, duration } = clampBlock(slot, 1);
          state.blocks[id] = {
            id,
            typeId,
            weekKey,
            dayIndex,
            startSlot,
            duration,
            capa: 'real',
            origenId: planId,
            abierto: sigue,
          };
        }),

      confirmarPlanEntero: (planId) =>
        set((state) => {
          const plan = state.blocks[planId];
          if (!plan) return;

          // Confirmar dos veces el mismo bloque ajusta el registro que ya
          // existe en vez de apilar un duplicado encima.
          const yaRegistrado = Object.values(state.blocks).find(
            (b) => b.capa === 'real' && b.origenId === planId,
          );
          if (yaRegistrado) {
            yaRegistrado.typeId = plan.typeId;
            yaRegistrado.startSlot = plan.startSlot;
            yaRegistrado.duration = plan.duration;
            yaRegistrado.abierto = false;
          } else {
            const id = nanoid();
            state.blocks[id] = {
              id,
              typeId: plan.typeId,
              weekKey: plan.weekKey,
              dayIndex: plan.dayIndex,
              startSlot: plan.startSlot,
              duration: plan.duration,
              capa: 'real',
              origenId: planId,
              abierto: false,
            };
          }

          // Todo el tramo queda contestado: la alarma no vuelve a preguntar por
          // un rato que ya diste por hecho.
          for (let s = plan.startSlot; s < plan.startSlot + plan.duration; s++) {
            state.slotsRespondidos[claveSlot(plan.weekKey, plan.dayIndex, s)] = true;
          }
          state.aviso = avisar(
            `Registrado: ${state.blockTypes[plan.typeId]?.name ?? 'bloque'}`,
          );
        }),

      cerrarRegistrosVencidos: (weekKey, dayIndex, slotActual) => {
        // Corre en cada tic del reloj, así que primero mira si hay algo que
        // hacer: un `set` que no muta igual notifica a los suscriptores.
        const vencidos = Object.values(get().blocks).filter(
          (b) =>
            b.capa === 'real' &&
            b.abierto &&
            (b.weekKey !== weekKey ||
              b.dayIndex !== dayIndex ||
              slotSiguiente(b) < slotActual),
        );
        if (vencidos.length === 0) return;
        set((state) => {
          for (const v of vencidos) {
            const b = state.blocks[v.id];
            if (b) b.abierto = false;
          }
        });
      },

      // ---- CRUD de tipos ----
      addBlockType: (type) => {
        const id = nanoid();
        set((state) => {
          state.blockTypes[id] = { ...type, id };
          state.blockTypeOrder.push(id);
        });
        return id;
      },
      updateBlockType: (id, patch) =>
        set((state) => {
          const t = state.blockTypes[id];
          if (!t) return;
          Object.assign(t, patch);
          // No hace falta tocar los bloques: referencian typeId y leen
          // el tipo en cada render → la edición se propaga sola.
        }),
      deleteBlockType: (id) =>
        set((state) => {
          // Es la acción más destructiva de la app: se lleva puestos los bloques
          // de ese tipo en TODAS las semanas, no sólo en la que se está viendo.
          const nombre = state.blockTypes[id]?.name;
          if (!nombre) return;
          for (const blockId of Object.keys(state.blocks)) {
            if (state.blocks[blockId].typeId === id) delete state.blocks[blockId];
          }
          delete state.blockTypes[id];
          state.blockTypeOrder = state.blockTypeOrder.filter((tid) => tid !== id);
          // Sin esto la selección quedaba apuntando a bloques ya borrados y la
          // barra de acciones seguía en pantalla, operando sobre nada.
          state.selectedBlockIds = state.selectedBlockIds.filter((x) => state.blocks[x]);
          state.aviso = avisar(`Tipo "${nombre}" eliminado`);
        }),

      // ---- Copiar / Pegar ----
      copySelectedBlocks: () =>
        set((state) => {
          if (state.selectedBlockIds.length === 0) return;
          state.clipboardSelection = state.selectedBlockIds
            .map((id) => state.blocks[id])
            .filter((b): b is ScheduleBlock => !!b)
            .map(({ id: _id, weekKey: _wk, ...rest }) => rest);
        }),
      pasteSelectedBlocks: () =>
        set((state) => {
          if (!state.clipboardSelection || state.clipboardSelection.length === 0) return;
          const newIds: string[] = [];
          for (const clip of state.clipboardSelection) {
            const id = nanoid();
            const clamped = clampBlock(clip.startSlot, clip.duration);
            state.blocks[id] = {
              ...clip,
              id,
              weekKey: state.currentWeekKey,
              startSlot: clamped.startSlot,
              duration: clamped.duration,
            };
            newIds.push(id);
          }
          state.selectedBlockIds = newIds;
        }),
      copyWeek: () =>
        set((state) => {
          state.clipboardWeek = Object.values(state.blocks)
            .filter((b) => b.weekKey === state.currentWeekKey)
            .map(({ id: _id, weekKey: _wk, recurringId: _rid, ...rest }) => rest);
        }),
      pasteWeek: (mode) =>
        set((state) => {
          if (!state.clipboardWeek) return;
          if (mode === 'replace') {
            for (const blockId of Object.keys(state.blocks)) {
              if (state.blocks[blockId].weekKey === state.currentWeekKey) delete state.blocks[blockId];
            }
          }
          for (const clip of state.clipboardWeek) {
            const id = nanoid();
            const { startSlot, duration } = clampBlock(clip.startSlot, clip.duration);
            state.blocks[id] = { ...clip, id, weekKey: state.currentWeekKey, startSlot, duration };
          }
        }),

      // ---- Modales / selección ----
      openModal: (kind, context) =>
        set((state) => {
          state.activeModal = kind;
          state.modalContext = context ?? null;
        }),
      closeModal: () =>
        set((state) => {
          state.activeModal = null;
          state.modalContext = null;
        }),
      setSelectedBlock: (id) =>
        set((state) => {
          state.selectedBlockIds = id ? [id] : [];
        }),
      toggleSelectedBlock: (id) =>
        set((state) => {
          if (state.selectedBlockIds.includes(id)) {
            state.selectedBlockIds = state.selectedBlockIds.filter((x) => x !== id);
          } else {
            state.selectedBlockIds = [...state.selectedBlockIds, id];
          }
        }),

      // ---- Avisos ----
      mostrarAviso: (texto, deshacer = true) =>
        set((state) => {
          state.aviso = avisar(texto, deshacer);
        }),
      ocultarAviso: () =>
        set((state) => {
          state.aviso = null;
        }),

      // ---- Mantenimiento ----
      clearWeek: (weekKey) =>
        set((state) => {
          let cuantos = 0;
          for (const blockId of Object.keys(state.blocks)) {
            if (state.blocks[blockId].weekKey === weekKey) {
              delete state.blocks[blockId];
              cuantos++;
            }
          }
          state.selectedBlockIds = [];
          if (cuantos > 0) state.aviso = avisar('Semana vaciada');
        }),

      // ---- Tema ----
      toggleDarkMode: () =>
        set((state) => {
          state.darkMode = !state.darkMode;
        }),

      // ---- Ajustes ----
      updateSetting: (key, value) =>
        set((state) => {
          (state.settings as AppSettings)[key] = value;
        }),
      navigateTo: (view) =>
        set((state) => {
          state.currentView = view;
        }),
    })),
      {
        // Historial de deshacer/rehacer: sólo datos, no estado efímero de UI.
        limit: 100,
        partialize: (state) => ({
          blocks: state.blocks,
          blockTypes: state.blockTypes,
          blockTypeOrder: state.blockTypeOrder,
        }),
        // Sin esto zundo guarda un paso por CADA `set`, aunque no toque los
        // datos: seleccionar un bloque, abrir un modal o cambiar de semana
        // dejaban pasos de deshacer que no deshacen nada visible, y había que
        // apretar Ctrl+Z dos o tres veces para llegar al cambio real.
        //
        // Alcanza con comparar referencias: immer no las toca si el slice no
        // cambió, así que dos objetos iguales acá son literalmente el mismo.
        equality: (a, b) =>
          a.blocks === b.blocks &&
          a.blockTypes === b.blockTypes &&
          a.blockTypeOrder === b.blockTypeOrder,
        // Throttle de borde inicial: un gesto de arrastrar/redimensionar
        // (muchos set seguidos) cuenta como UN solo paso de deshacer.
        handleSet: (handleSet) => {
          let last = 0;
          return ((...args: Parameters<typeof handleSet>) => {
            const now = Date.now();
            if (now - last > 400) handleSet(...args);
            last = now;
          }) as typeof handleSet;
        },
      },
    ),
    {
      name: 'weekly-planner-v1-' + getActiveProfileId(),
      storage: createJSONStorage(() => localStorage),
      // Sólo persistir datos, no estado efímero de UI
      partialize: (state) => ({
        blockTypes: state.blockTypes,
        blocks: state.blocks,
        blockTypeOrder: state.blockTypeOrder,
        darkMode: state.darkMode,
        settings: state.settings,
        slotsRespondidos: state.slotsRespondidos,
      }),
      // Combina lo guardado con el estado actual para que las claves nuevas
      // de `settings` (p.ej. printLineColor) siempre tengan su default,
      // aunque el localStorage venga de una versión anterior.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ScheduleStore>;
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
          // Un localStorage anterior a la capa de registro no trae la clave, y
          // las acciones escriben adentro sin chequear.
          slotsRespondidos: p.slotsRespondidos ?? {},
        };
      },
    },
  ),
);
