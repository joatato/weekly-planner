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
  /** Default de seguimiento para los bloques de este tipo. Ver `Seguimiento`. */
  seguimiento?: Seguimiento;
}

/**
 * Las dos capas del semanal.
 *  - 'plan': lo que querés hacer. Es la capa de siempre.
 *  - 'real': lo que efectivamente hiciste, según lo que confirmaste.
 *
 * Es un campo y no una colección aparte a propósito: arrastrar, redimensionar,
 * copiar, imprimir, sincronizar y deshacer ya operan sobre `blocks`, y con dos
 * colecciones habría que duplicar las seis cosas.
 *
 * `capa` ausente se lee como 'plan' — así el localStorage viejo y los documentos
 * que ya están en Firestore siguen valiendo sin migrarlos.
 */
export type Capa = 'plan' | 'real';

/** Qué capa se está mirando en la grilla. */
export type CapaVisible = Capa | 'ambos';

/** Cómo se dibujan las dos capas juntas cuando `capaVisible` es 'ambos'. */
export type EstiloAmbos = 'lado' | 'superpuesto';

/**
 * Si un bloque pide confirmación cada 30 min hasta que contestás que no.
 * Se resuelve en cascada bloque → tipo → ajuste global; 'heredar' delega en el
 * nivel de arriba. Ver `resolverSeguimiento` en `src/lib/seguimiento.ts`.
 */
export type Seguimiento = 'heredar' | 'si' | 'no';

/** Lo que se puede contestar cuando suena la alarma de un bloque. */
export type RespuestaAlarma =
  | { tipo: 'plan' } // lo estoy haciendo
  | { tipo: 'otro'; typeId: string } // estoy con otra cosa
  | { tipo: 'nada' }; // no confirmado — corta el bucle

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

  /** Ausente = 'plan'. Ver `Capa`. */
  capa?: Capa;
  /** Sólo en capa 'plan': si pide confirmación cada 30 min. Ver `Seguimiento`. */
  seguimiento?: Seguimiento;
  /** Sólo en capa 'real': el bloque de plan que lo originó, si hubo uno.
   *  Ausente = se registró algo que no estaba planificado. */
  origenId?: string;
  /**
   * Sólo en capa 'real': sigue acumulando confirmaciones de 30 min.
   *
   * Va persistido y no en un ref para que sobreviva a recargar la app. Si no,
   * cerrar la pestaña con una actividad en curso perdía el hilo del bucle.
   */
  abierto?: boolean;
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

/**
 * Aviso efímero al pie de la pantalla, con la opción de deshacer lo que acaba
 * de pasar. `id` cambia en cada aviso nuevo: es lo que reinicia el temporizador
 * cuando el texto se repite (borrar dos bloques seguidos son dos avisos
 * iguales, y el segundo tiene que durar sus segundos completos).
 */
export interface Aviso {
  id: string;
  texto: string;
  /** Si ofrece el botón "Deshacer". */
  deshacer: boolean;
}

/**
 * Slots cuya alarma ya se contestó, para no volver a preguntar.
 * Clave: `${weekKey}:${dayIndex}:${slot}`.
 *
 * Va persistido porque la respuesta "nada" no deja bloque real: sin esto, el
 * "no confirmado" que corta el bucle se olvidaba al recargar y la alarma volvía
 * a preguntar por un rato que ya diste por perdido.
 */
export type SlotsRespondidos = Record<string, true>;

/** Estado que se persiste en localStorage */
export interface PersistedState {
  blockTypes: Record<string, BlockType>;
  blocks: Record<string, ScheduleBlock>;
  blockTypeOrder: string[];
  darkMode: boolean;
  settings: AppSettings;
  slotsRespondidos: SlotsRespondidos;
}

export interface AppSettings {
  // Grilla
  visibleStartHour: number;  // 6–22, default 6
  visibleEndHour: number;    // 7–23, default 23
  slotHeightPx: number;      // 20–50, default 26
  showWeekends: boolean;
  hourFormat: '24h' | '12h';
  // Sonido
  /** La alarma de un bloque que arranca. */
  soundEnabled: boolean;
  /**
   * Los sonidos y la vibración de la interfaz: crear, mover, borrar, deshacer.
   *
   * Aparte de `soundEnabled` y apagado por default. Querer que te avise cuando
   * empieza un bloque y no querer un clic cada vez que movés algo son dos
   * cosas distintas, y los sonidos de interfaz tienen que ser algo que elegís,
   * no algo que te aparece.
   */
  soundEffects: boolean;
  /** Entrar en pantalla completa al abrir la app. No puede pasar en la carga
   *  —el navegador exige un gesto—, así que entra con el primer toque. */
  fullscreenOnOpen: boolean;
  /** Animación de entrada al abrir. Se puede apagar. */
  introAnimation: boolean;
  // Capa de registro
  /** Qué capa muestra la grilla: el plan, lo realmente hecho, o las dos. */
  capaVisible: CapaVisible;
  /** Cómo se dibujan las dos juntas cuando `capaVisible` es 'ambos'. */
  estiloAmbos: EstiloAmbos;
  /** Base de la cascada de seguimiento, para los bloques y tipos en 'heredar'. */
  seguimientoGlobal: boolean;
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
