import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

import { aplicarNombreRemoto } from './profiles';
import { useScheduleStore } from '../store/useScheduleStore';
import type { BlockType, ScheduleBlock } from '../types';

/**
 * Sincronización de un perfil contra `users/{uid}/perfiles/{profileId}`.
 *
 * Un documento por bloque y uno por tipo, no el semanal entero en un documento.
 * Firestore resuelve conflictos con "gana el último que escribe": con todo
 * junto, editar sin señal en el teléfono y después en la compu hace que uno se
 * lleve puesto al otro completo. Separado, se fusionan solos salvo que se toque
 * exactamente el mismo bloque.
 *
 * No hay motor de sincronización acá. El SDK ya encola las escrituras sin
 * conexión y las manda al reconectar (ver `getDb`). Esto es solo el puente
 * entre esa colección y el store de Zustand.
 */

/** Lo que se guarda en Firestore. `updatedAt` es del cliente, no del servidor:
 *  `serverTimestamp()` llega null hasta que el servidor confirma, y sin señal
 *  eso es indefinido. Alcanza para desempatar. */
interface DocBloque extends Omit<ScheduleBlock, 'id'> {
  updatedAt: number;
}
interface DocTipo extends Omit<BlockType, 'id'> {
  updatedAt: number;
}

/** Firestore rechaza `undefined`. `note` y `recurringId` son opcionales. */
export function sinIndefinidos<T extends object>(obj: T): T {
  const salida = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (salida as Record<string, unknown>)[k] = v;
  }
  return salida;
}

/** Clave de comparación: lo que define si hace falta escribir. `updatedAt`
 *  queda afuera a propósito — si no cambió nada más, no es un cambio. */
function huellaBloque(b: ScheduleBlock): string {
  return JSON.stringify([b.typeId, b.weekKey, b.dayIndex, b.startSlot, b.duration, b.note ?? '', b.recurringId ?? '']);
}
function huellaTipo(t: BlockType): string {
  return JSON.stringify([t.name, t.color, t.textColor]);
}

/** Aplica cambios que vienen de la nube sin ensuciar el historial de deshacer:
 *  Ctrl+Z no tiene que revertir lo que hizo otro dispositivo. */
function aplicarSinHistorial(receta: (estado: ReturnType<typeof useScheduleStore.getState>) => void) {
  const temporal = useScheduleStore.temporal.getState();
  temporal.pause();
  try {
    useScheduleStore.setState(receta);
  } finally {
    temporal.resume();
  }
}

/**
 * Todo tipo tiene que estar en el orden, y el orden no puede nombrar tipos que
 * ya no existen: `useOrderedBlockTypes` recorre el orden, así que un tipo que
 * baja de la nube sin entrada en la lista no se ve en la barra lateral aunque
 * exista. Se autocorrige después de cada bajada.
 */
export function ordenSaneado(idsTipos: string[], orden: string[]): string[] {
  const ids = new Set(idsTipos);
  const salida = orden.filter((id, i) => ids.has(id) && orden.indexOf(id) === i);
  for (const id of ids) if (!salida.includes(id)) salida.push(id);
  return salida;
}

function sanearOrden(estado: ReturnType<typeof useScheduleStore.getState>) {
  estado.blockTypeOrder = ordenSaneado(Object.keys(estado.blockTypes), estado.blockTypeOrder);
}

const ESPERA_SUBIDA_MS = 600;

export function sincronizarPerfil(
  db: Firestore,
  uid: string,
  profileId: string,
  /** Se llama si Firestore rechaza la suscripción (reglas, cuota, proyecto mal
   *  configurado). Sin esto el error queda sólo en la consola y la UI miente. */
  alFallar?: (err: unknown) => void,
): () => void {
  const base = doc(db, 'users', uid, 'perfiles', profileId);
  const colBloques = collection(base, 'bloques');
  const colTipos = collection(base, 'tipos');

  // Lo que creemos que hay en el servidor. Evita el eco: aplicar una bajada
  // dispara el subscribe del store, que compara contra esto y no escribe.
  const espejoBloques = new Map<string, string>();
  const espejoTipos = new Map<string, string>();

  let primeraBloques = true;
  let primeraTipos = true;
  let vivo = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const avisarFallo = (err: unknown) => {
    if (!vivo) return;
    console.error('Firestore rechazó la suscripción', err);
    alFallar?.(err);
  };

  const subirPendientes = () => {
    if (!vivo || primeraBloques || primeraTipos) return;
    const { blocks, blockTypes, blockTypeOrder } = useScheduleStore.getState();

    for (const b of Object.values(blocks)) {
      const h = huellaBloque(b);
      if (espejoBloques.get(b.id) === h) continue;
      espejoBloques.set(b.id, h);
      void setDoc(
        doc(colBloques, b.id),
        sinIndefinidos<DocBloque>({
          typeId: b.typeId,
          weekKey: b.weekKey,
          dayIndex: b.dayIndex,
          startSlot: b.startSlot,
          duration: b.duration,
          note: b.note,
          recurringId: b.recurringId,
          updatedAt: Date.now(),
        }),
      );
    }
    for (const id of [...espejoBloques.keys()]) {
      if (blocks[id]) continue;
      espejoBloques.delete(id);
      void deleteDoc(doc(colBloques, id));
    }

    for (const t of Object.values(blockTypes)) {
      const h = huellaTipo(t);
      if (espejoTipos.get(t.id) === h) continue;
      espejoTipos.set(t.id, h);
      void setDoc(doc(colTipos, t.id), {
        name: t.name,
        color: t.color,
        textColor: t.textColor,
        updatedAt: Date.now(),
      } satisfies DocTipo);
    }
    for (const id of [...espejoTipos.keys()]) {
      if (blockTypes[id]) continue;
      espejoTipos.delete(id);
      void deleteDoc(doc(colTipos, id));
    }

    // Solo el orden. El nombre vive en este mismo documento pero NO se escribe
    // acá a propósito: esto se dispara con cada cambio de datos, y mandaría el
    // nombre que tenga este dispositivo aunque otro lo haya renombrado después
    // —moviendo un bloque se desharía un renombre ajeno—. El nombre sube por
    // `subirNombreSiHaySesion`, que corre al renombrar y encola si no hay señal.
    void setDoc(base, { orden: blockTypeOrder, updatedAt: Date.now() }, { merge: true });
  };

  const agendarSubida = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(subirPendientes, ESPERA_SUBIDA_MS);
  };

  const cortarBloques = onSnapshot(colBloques, (snap) => {
    if (!vivo) return;
    const cambios = snap.docChanges();
    // La PRIMERA bajada no borra nada: lo que está local y no está en la nube
    // es un bloque que todavía no se subió, no uno que alguien borró. De la
    // segunda en adelante, un `removed` sí es un borrado real.
    const esPrimera = primeraBloques;
    aplicarSinHistorial((estado) => {
      for (const c of cambios) {
        const id = c.doc.id;
        if (c.type === 'removed') {
          if (esPrimera) continue;
          delete estado.blocks[id];
          estado.selectedBlockIds = estado.selectedBlockIds.filter((x) => x !== id);
          continue;
        }
        const d = c.doc.data() as DocBloque;
        estado.blocks[id] = {
          id,
          typeId: d.typeId,
          weekKey: d.weekKey,
          dayIndex: d.dayIndex,
          startSlot: d.startSlot,
          duration: d.duration,
          ...(d.note !== undefined ? { note: d.note } : {}),
          ...(d.recurringId !== undefined ? { recurringId: d.recurringId } : {}),
        };
      }
    });
    for (const c of cambios) {
      if (c.type === 'removed') espejoBloques.delete(c.doc.id);
      else {
        const b = useScheduleStore.getState().blocks[c.doc.id];
        if (b) espejoBloques.set(b.id, huellaBloque(b));
      }
    }
    primeraBloques = false;
    agendarSubida();
  }, avisarFallo);

  const cortarTipos = onSnapshot(colTipos, (snap) => {
    if (!vivo) return;
    const cambios = snap.docChanges();
    const esPrimera = primeraTipos;
    aplicarSinHistorial((estado) => {
      for (const c of cambios) {
        const id = c.doc.id;
        if (c.type === 'removed') {
          if (esPrimera) continue;
          delete estado.blockTypes[id];
          continue;
        }
        const d = c.doc.data() as DocTipo;
        estado.blockTypes[id] = { id, name: d.name, color: d.color, textColor: d.textColor };
      }
      sanearOrden(estado);
    });
    for (const c of cambios) {
      if (c.type === 'removed') espejoTipos.delete(c.doc.id);
      else {
        const t = useScheduleStore.getState().blockTypes[c.doc.id];
        if (t) espejoTipos.set(t.id, huellaTipo(t));
      }
    }
    primeraTipos = false;
    agendarSubida();
  }, avisarFallo);

  // El orden de la barra lateral vive en el documento del perfil, no en un
  // documento por tipo: es una lista, y partirla en documentos no aporta nada.
  const cortarPerfil = onSnapshot(base, (snap) => {
    if (!vivo) return;
    const datos = snap.data();

    // El nombre del perfil vive en localStorage, no en el store, así que se
    // aplica aparte y avisa por su cuenta a quien lo muestre. Va antes del
    // early return del orden: un perfil recién renombrado y sin tipos todavía
    // no tiene `orden`, y si no, el renombre se perdería.
    const nombre = datos?.nombre as string | undefined;
    if (nombre) aplicarNombreRemoto(profileId, nombre, datos?.nombreEn as number | undefined);

    const orden = datos?.orden as string[] | undefined;
    if (!orden) return;
    aplicarSinHistorial((estado) => {
      estado.blockTypeOrder = orden;
      sanearOrden(estado);
    });
  }, avisarFallo);

  const cortarStore = useScheduleStore.subscribe(agendarSubida);

  return () => {
    vivo = false;
    if (timer) clearTimeout(timer);
    cortarBloques();
    cortarTipos();
    cortarPerfil();
    cortarStore();
  };
}
