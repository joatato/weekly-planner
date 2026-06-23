import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';

import type {
  AppSettings,
  AppView,
  BlockType,
  ScheduleBlock,
  ClipboardBlock,
  ModalKind,
  ModalContext,
  PersistedState,
} from '../types';
import { DEFAULT_BLOCK_TYPES, DEFAULT_SETTINGS } from '../lib/constants';
import { getActiveProfileId } from '../lib/profiles';
import { getCurrentWeekKey, navigateWeekKey } from '../lib/dateUtils';
import { clampBlock } from '../lib/blockUtils';

interface ScheduleStore extends PersistedState {
  // ---- Estado de navegación / UI (no persistido) ----
  currentWeekKey: string;
  currentView: AppView;
  selectedBlockId: string | null;
  clipboardBlock: ClipboardBlock | null;
  activeModal: ModalKind | null;
  modalContext: ModalContext | null;

  // ---- Navegación ----
  navigateWeek: (direction: 'prev' | 'next') => void;
  goToCurrentWeek: () => void;
  setWeekKey: (weekKey: string) => void;

  // ---- CRUD de bloques ----
  addBlock: (block: Omit<ScheduleBlock, 'id'>) => string;
  addBlocks: (blocks: Omit<ScheduleBlock, 'id'>[]) => void;
  updateBlock: (id: string, patch: Partial<ScheduleBlock>) => void;
  deleteBlock: (id: string) => void;
  moveBlock: (id: string, dayIndex: number, startSlot: number) => void;
  resizeBlock: (id: string, duration: number) => void;

  // ---- CRUD de tipos ----
  addBlockType: (type: Omit<BlockType, 'id'>) => string;
  updateBlockType: (id: string, patch: Partial<BlockType>) => void;
  deleteBlockType: (id: string) => void;

  // ---- Copiar / Pegar ----
  copyBlock: (id: string) => void;
  pasteBlock: (dayIndex: number, startSlot: number) => void;

  // ---- Modales / selección ----
  openModal: (kind: ModalKind, context?: ModalContext) => void;
  closeModal: () => void;
  setSelectedBlock: (id: string | null) => void;

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
      immer((set) => ({
      // ---- Estado inicial ----
      blockTypes: initialBlockTypes,
      blocks: {},
      blockTypeOrder: DEFAULT_BLOCK_TYPES.map((t) => t.id),
      darkMode: false,
      settings: DEFAULT_SETTINGS,

      currentWeekKey: getCurrentWeekKey(),
      currentView: 'calendar' as AppView,
      selectedBlockId: null,
      clipboardBlock: null,
      activeModal: null,
      modalContext: null,

      // ---- Navegación ----
      navigateWeek: (direction) =>
        set((state) => {
          state.currentWeekKey = navigateWeekKey(state.currentWeekKey, direction);
          state.selectedBlockId = null;
        }),
      goToCurrentWeek: () =>
        set((state) => {
          state.currentWeekKey = getCurrentWeekKey();
          state.selectedBlockId = null;
        }),
      setWeekKey: (weekKey) =>
        set((state) => {
          state.currentWeekKey = weekKey;
          state.selectedBlockId = null;
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
          delete state.blocks[id];
          if (state.selectedBlockId === id) state.selectedBlockId = null;
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
      resizeBlock: (id, duration) =>
        set((state) => {
          const b = state.blocks[id];
          if (!b) return;
          const clamped = clampBlock(b.startSlot, duration);
          b.duration = clamped.duration;
        }),

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
          // Elimina también todos los bloques de este tipo en todas las semanas
          for (const blockId of Object.keys(state.blocks)) {
            if (state.blocks[blockId].typeId === id) delete state.blocks[blockId];
          }
          delete state.blockTypes[id];
          state.blockTypeOrder = state.blockTypeOrder.filter((tid) => tid !== id);
        }),

      // ---- Copiar / Pegar ----
      copyBlock: (id) =>
        set((state) => {
          const b = state.blocks[id];
          if (!b) return;
          const { id: _id, weekKey: _wk, ...rest } = b;
          state.clipboardBlock = rest;
        }),
      pasteBlock: (dayIndex, startSlot) =>
        set((state) => {
          if (!state.clipboardBlock) return;
          const id = nanoid();
          const clamped = clampBlock(startSlot, state.clipboardBlock.duration);
          state.blocks[id] = {
            ...state.clipboardBlock,
            id,
            weekKey: state.currentWeekKey,
            dayIndex,
            startSlot: clamped.startSlot,
            duration: clamped.duration,
          };
          state.selectedBlockId = id;
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
          state.selectedBlockId = id;
        }),

      // ---- Mantenimiento ----
      clearWeek: (weekKey) =>
        set((state) => {
          for (const blockId of Object.keys(state.blocks)) {
            if (state.blocks[blockId].weekKey === weekKey) delete state.blocks[blockId];
          }
          state.selectedBlockId = null;
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
        };
      },
    },
  ),
);
