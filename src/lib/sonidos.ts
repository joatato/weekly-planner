// Sonidos de interfaz, sintetizados.
//
// Sin archivos de audio, siguiendo lo que ya hacía el beep de alerta. No es
// capricho: el bundle entero entra al precache del service worker, así que un
// set de .mp3 serían 200-400 kB que se bajan sí o sí al instalar la PWA. Estos
// pesan 0 bytes y andan sin conexión desde el primer arranque.
//
// La familia entera es corta (20-120 ms), suave, y usa la dirección del tono
// para contar qué pasó: sube cuando algo aparece, baja cuando algo se va. Que
// suenen emparentados es lo que hace que un sonido de interfaz se vuelva
// invisible en vez de irritante.

import { useScheduleStore } from '../store/useScheduleStore';

export type Sonido = 'crear' | 'mover' | 'borrar' | 'tick' | 'deshacer' | 'rehacer' | 'error';

/** Volumen general. Bajo a propósito: esto acompaña, no anuncia. */
const VOLUMEN = 0.14;
/** Piso entre dos sonidos iguales. Sin esto, redimensionar es una ametralladora. */
const MINIMO_ENTRE_SONIDOS_MS = 45;

interface Receta {
  desde: number;
  hasta?: number;
  dur: number;
  tipo?: OscillatorType;
  vol?: number;
}

const RECETAS: Record<Sonido, Receta[]> = {
  // Algo apareció: el tono sube.
  crear: [{ desde: 520, hasta: 790, dur: 0.09 }],
  // No es nuevo, sólo cambió de lugar: seco y grave, sin recorrido de tono.
  mover: [{ desde: 300, dur: 0.05, tipo: 'triangle' }],
  // Algo se fue: baja.
  borrar: [{ desde: 480, hasta: 190, dur: 0.13 }],
  // Como la muesca de un dial. Muy corto y muy bajo, suena decenas de veces.
  tick: [{ desde: 900, dur: 0.02, tipo: 'square', vol: 0.04 }],
  // Deshacer y rehacer son la misma acción al revés, y suenan espejados.
  deshacer: [{ desde: 620, hasta: 400, dur: 0.08 }],
  rehacer: [{ desde: 400, hasta: 620, dur: 0.08 }],
  // Lo único que puede permitirse ser feo.
  error: [
    { desde: 200, dur: 0.07, tipo: 'square', vol: 0.09 },
    { desde: 150, dur: 0.09, tipo: 'square', vol: 0.09 },
  ],
};

let ctx: AudioContext | null = null;
let ultimoPorSonido: Partial<Record<Sonido, number>> = {};

/**
 * El contexto se crea perezosamente y recién en un gesto: uno creado durante
 * la carga nace `suspended` y no suena. Uno solo para toda la app — Safari
 * corta cerca de seis contextos abiertos, y el modal de alerta ya creaba el
 * suyo por cada alerta.
 */
function obtenerContexto(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tocar(r: Receta, cuando: number): void {
  const c = obtenerContexto();
  if (!c) return;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = r.tipo ?? 'sine';
  osc.frequency.setValueAtTime(r.desde, cuando);
  if (r.hasta) osc.frequency.exponentialRampToValueAtTime(r.hasta, cuando + r.dur);

  // Arranca en silencio y sube en 5 ms. Entrar de golpe en el volumen final
  // produce un chasquido audible —el salto de la onda desde cero—, y ese
  // chasquido es lo que hace que los sonidos de interfaz suenen baratos.
  const vol = r.vol ?? VOLUMEN;
  gain.gain.setValueAtTime(0.0001, cuando);
  gain.gain.exponentialRampToValueAtTime(vol, cuando + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, cuando + r.dur);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(cuando);
  osc.stop(cuando + r.dur + 0.02);
}

/** Suena, salvo que el ajuste esté apagado o llegue muy pegado al anterior. */
export function reproducir(sonido: Sonido): void {
  if (!useScheduleStore.getState().settings.soundEffects) return;

  const ahora = performance.now();
  if (ahora - (ultimoPorSonido[sonido] ?? 0) < MINIMO_ENTRE_SONIDOS_MS) return;
  ultimoPorSonido[sonido] = ahora;

  const c = obtenerContexto();
  if (!c) return;
  let t = c.currentTime;
  for (const receta of RECETAS[sonido]) {
    tocar(receta, t);
    t += receta.dur + 0.03;
  }
}

/**
 * Vibración corta. Va de la mano con el sonido y no en su lugar: es lo único
 * que se siente con el teléfono en silencio, que es como está casi siempre.
 * iOS ignora la API, así que degrada sola.
 */
export function vibrar(ms = 10): void {
  if (!useScheduleStore.getState().settings.soundEffects) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Algunos navegadores la exponen y tiran si el documento no tuvo gesto.
  }
}

/** Sonido + vibración, que es como se usa casi siempre. */
export function responder(sonido: Sonido, msVibracion = 10): void {
  reproducir(sonido);
  vibrar(msVibracion);
}

/** Para los tests: deja el módulo como recién importado. */
export function _reiniciarParaTests(): void {
  ctx = null;
  ultimoPorSonido = {};
}
