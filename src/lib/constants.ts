import type { AppSettings, BlockType, TimeSlot } from '../types';

/** Primer hora visible de la grilla */
export const START_HOUR = 6;
/** Cantidad de slots de 30 min. 34 slots → 06:00 hasta 23:00 */
export const SLOT_COUNT = 34;
/** Altura en px de un slot de 30 min en la vista en pantalla */
export const SLOT_HEIGHT_PX = 26;

/** TIME_SLOTS: 34 filas que cubren 06:00 → 22:30 (último bloque termina 23:00) */
export const TIME_SLOTS: TimeSlot[] = Array.from({ length: SLOT_COUNT }, (_, i) => {
  const hour = START_HOUR + Math.floor(i / 2);
  const minute = (i % 2 === 0 ? 0 : 30) as 0 | 30;
  return {
    index: i,
    label: `${String(hour).padStart(2, '0')}:${minute === 0 ? '00' : '30'}`,
    hour,
    minute,
  };
});

export const DAY_NAMES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

export const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

/** Tipos de bloque incluidos por defecto (basados en la imagen de referencia) */
export const DEFAULT_BLOCK_TYPES: BlockType[] = [
  { id: 'desayuno', name: 'Desayuno', color: '#FDE68A', textColor: '#1f2937' },
  { id: 'higiene', name: 'Higiene', color: '#C4B5FD', textColor: '#1f2937' },
  { id: 'trabajo', name: 'Trabajo', color: '#A7F3D0', textColor: '#1f2937' },
  { id: 'estudio', name: 'Estudio', color: '#BFDBFE', textColor: '#1f2937' },
  { id: 'almuerzo', name: 'Almuerzo', color: '#FBCFE8', textColor: '#1f2937' },
  { id: 'comprar', name: 'Comprar', color: '#BEF264', textColor: '#1f2937' },
  { id: 'orden', name: 'Orden', color: '#FED7AA', textColor: '#1f2937' },
  { id: 'cena', name: 'Cena', color: '#FBCFE8', textColor: '#1f2937' },
];

/** Convierte hora visible en índice de slot (START_HOUR = 6) */
export function hourToSlot(hour: number): number {
  return (hour - START_HOUR) * 2;
}

/** Valores por defecto de los ajustes de usuario */
export const DEFAULT_SETTINGS: AppSettings = {
  visibleStartHour: START_HOUR,
  visibleEndHour: 23,
  slotHeightPx: SLOT_HEIGHT_PX,
  showWeekends: true,
  hourFormat: '24h',
  soundEnabled: true,
  soundEffects: false,
  fullscreenOnOpen: false,
  introAnimation: true,
  printCellBorderWidth: 1,
  printTimeFontSize: 7,
  printBlockFontSize: 8,
  printLineColor: '#6b7280',
};

/** Paleta para el tono de líneas impresas: negro, grises y algunos colores */
export const LINE_COLOR_PALETTE: string[] = [
  '#000000',
  '#374151',
  '#6b7280',
  '#9ca3af',
  '#1d4ed8',
  '#15803d',
  '#b91c1c',
  '#7c3aed',
];

/** Paleta de colores para el selector (pasteles modernos + algunos saturados) */
export const COLOR_PALETTE: string[] = [
  '#FDE68A', // amber-200
  '#FCD34D', // amber-300
  '#FED7AA', // orange-200
  '#FDBA74', // orange-300
  '#FECACA', // red-200
  '#FCA5A5', // red-300
  '#FBCFE8', // pink-200
  '#F9A8D4', // pink-300
  '#E9D5FF', // purple-200
  '#C4B5FD', // violet-300
  '#DDD6FE', // violet-200
  '#A5B4FC', // indigo-300
  '#BFDBFE', // blue-200
  '#93C5FD', // blue-300
  '#A5F3FC', // cyan-200
  '#99F6E4', // teal-200
  '#A7F3D0', // emerald-200
  '#6EE7B7', // emerald-300
  '#BBF7D0', // green-200
  '#BEF264', // lime-300
  '#FEF08A', // yellow-200
  '#E5E7EB', // gray-200
  '#D1D5DB', // gray-300
  '#9CA3AF', // gray-400
];
