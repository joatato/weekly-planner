/**
 * Un tipo de bloque define la categoría semántica + identidad visual.
 * Editar un BlockType se propaga a TODOS los bloques que lo referencian,
 * en TODAS las semanas.
 */
export interface BlockType {
  id: string;
  name: string; // ej. "Desayuno", "Trabajo"
  color: string; // hex de fondo, ej. "#FDE68A"
  textColor: string; // "#1f2937" o "#ffffff" (auto por contraste)
}

/**
 * Una instancia de bloque vive en una semana y día específicos.
 * startSlot: índice 0-based dentro de TIME_SLOTS (0 = primera fila)
 * duration: cantidad de slots de 30 min que ocupa (mínimo 1)
 */
export interface ScheduleBlock {
  id: string;
  typeId: string; // referencia a BlockType.id
  weekKey: string; // clave ISO de semana: "2026-W23"
  dayIndex: number; // 0 = Lunes ... 6 = Domingo
  startSlot: number; // 0-based
  duration: number; // en slots (1 = 30 min)
  note?: string; // anotación libre opcional
  recurringId?: string; // UUID compartido entre instancias de una recurrencia semanal
}

/** Bloque resuelto con su tipo embebido — usado al renderizar */
export interface ResolvedBlock extends ScheduleBlock {
  type: BlockType;
}

/** Una fila de tiempo en la constante TIME_SLOTS */
export interface TimeSlot {
  index: number; // 0-based
  label: string; // "06:00", "06:30", ...
  hour: number;
  minute: 0 | 30;
}

/** Contenido del portapapeles interno (sin id ni weekKey) */
export type ClipboardBlock = Omit<ScheduleBlock, 'id' | 'weekKey'>;

/** Estado que se persiste en localStorage */
export interface PersistedState {
  blockTypes: Record<string, BlockType>;
  blocks: Record<string, ScheduleBlock>;
  blockTypeOrder: string[];
  darkMode: boolean;
  settings: AppSettings;
}

export interface AppSettings {
  // Grilla
  visibleStartHour: number;  // 6–22, default 6
  visibleEndHour: number;    // 7–23, default 23
  slotHeightPx: number;      // 20–50, default 26
  showWeekends: boolean;
  hourFormat: '24h' | '12h';
  // Sonido
  soundEnabled: boolean;
  /** Entrar en pantalla completa al abrir la app. No puede pasar en la carga
   *  —el navegador exige un gesto—, así que entra con el primer toque. */
  fullscreenOnOpen: boolean;
  /** Animación de entrada al abrir. Se puede apagar. */
  introAnimation: boolean;
  // Impresión
  printCellBorderWidth: number; // 0.5–3, default 1
  printTimeFontSize: number;    // 6–14, default 7
  printBlockFontSize: number;   // 6–14, default 8
  printLineColor: string;       // hex 6 dígitos, color de las líneas impresas
}

export type AppView = 'calendar' | 'settings';

export type ModalKind = 'createBlock' | 'editBlock' | 'editType' | 'createType';

export interface ModalContext {
  blockId?: string;
  typeId?: string;
  dayIndex?: number;
  startSlot?: number;
  duration?: number;
}
