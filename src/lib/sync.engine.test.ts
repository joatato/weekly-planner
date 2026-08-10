import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Prueba el puente entre Firestore y el store con un Firestore de mentira.
 *
 * Lo que se prueba es exactamente lo que puede perder datos: que la primera
 * bajada no borre lo local, que la segunda sí borre lo que se borró de verdad,
 * y que aplicar una bajada no rebote como subida.
 */

type Escucha = { next: (snap: unknown) => void; error?: (e: unknown) => void };
const escuchas = new Map<string, Escucha>();
const escrituras: Array<{ path: string; data: Record<string, unknown> }> = [];
const borrados: string[] = [];

vi.mock('firebase/firestore', () => {
  const ruta = (x: unknown): string =>
    typeof x === 'object' && x !== null && '__path' in x ? String((x as { __path: string }).__path) : '';
  return {
    collection: (padre: unknown, nombre: string) => ({ __path: `${ruta(padre)}/${nombre}` }),
    doc: (padre: unknown, ...segmentos: string[]) => ({ __path: `${ruta(padre)}/${segmentos.join('/')}` }),
    onSnapshot: (ref: { __path: string }, next: Escucha['next'], error?: Escucha['error']) => {
      escuchas.set(ref.__path, { next, error });
      return () => escuchas.delete(ref.__path);
    },
    setDoc: async (ref: { __path: string }, data: Record<string, unknown>) => {
      escrituras.push({ path: ref.__path, data });
    },
    deleteDoc: async (ref: { __path: string }) => {
      borrados.push(ref.__path);
    },
  };
});

const { sincronizarPerfil } = await import('./sync');
const { useScheduleStore } = await import('../store/useScheduleStore');

const BASE = '/users/u1/perfiles/p1';
const BLOQUES = `${BASE}/bloques`;
const TIPOS = `${BASE}/tipos`;

function cambio(tipo: 'added' | 'modified' | 'removed', id: string, data: Record<string, unknown> = {}) {
  return { type: tipo, doc: { id, data: () => data } };
}
function emitir(path: string, cambios: ReturnType<typeof cambio>[]) {
  escuchas.get(path)!.next({ docChanges: () => cambios });
}
function bloqueRemoto(typeId = 'trabajo', extra: Record<string, unknown> = {}) {
  return { typeId, weekKey: '2026-W32', dayIndex: 1, startSlot: 4, duration: 2, updatedAt: 1, ...extra };
}

/** Deja los dos primeros snapshots emitidos: a partir de acá los `removed` borran. */
function primerasBajadas(bloques: ReturnType<typeof cambio>[] = [], tipos: ReturnType<typeof cambio>[] = []) {
  emitir(BLOQUES, bloques);
  emitir(TIPOS, tipos);
}

let cortar: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  escuchas.clear();
  escrituras.length = 0;
  borrados.length = 0;
  useScheduleStore.setState({ blocks: {}, blockTypes: {}, blockTypeOrder: [] });
  cortar = sincronizarPerfil({} as never, 'u1', 'p1');
});

afterEach(() => {
  cortar();
  vi.useRealTimers();
});

describe('bajada', () => {
  it('la primera bajada NO borra lo que está local y no está en la nube', () => {
    useScheduleStore.setState({
      blocks: { local1: { id: 'local1', typeId: 't', weekKey: '2026-W32', dayIndex: 0, startSlot: 0, duration: 2 } },
    });
    primerasBajadas([cambio('removed', 'local1')]);
    expect(useScheduleStore.getState().blocks.local1).toBeDefined();
  });

  it('de la segunda bajada en adelante, un removed sí borra', () => {
    useScheduleStore.setState({
      blocks: { b1: { id: 'b1', typeId: 't', weekKey: '2026-W32', dayIndex: 0, startSlot: 0, duration: 2 } },
    });
    primerasBajadas();
    emitir(BLOQUES, [cambio('removed', 'b1')]);
    expect(useScheduleStore.getState().blocks.b1).toBeUndefined();
  });

  it('un bloque que baja entra al store con su id', () => {
    primerasBajadas([cambio('added', 'remoto1', bloqueRemoto())]);
    expect(useScheduleStore.getState().blocks.remoto1).toMatchObject({
      id: 'remoto1',
      typeId: 'trabajo',
      dayIndex: 1,
      startSlot: 4,
    });
  });

  it('no inventa note ni recurringId cuando el documento no los trae', () => {
    primerasBajadas([cambio('added', 'r1', bloqueRemoto())]);
    const b = useScheduleStore.getState().blocks.r1;
    expect('note' in b).toBe(false);
    expect('recurringId' in b).toBe(false);
  });

  it('un tipo que baja se agrega al orden, o no se vería en la barra lateral', () => {
    primerasBajadas([], [cambio('added', 'nuevo', { name: 'Gimnasio', color: '#fff', textColor: '#000' })]);
    expect(useScheduleStore.getState().blockTypeOrder).toContain('nuevo');
  });

  it('borrar un bloque desde la nube también lo saca de la selección', () => {
    useScheduleStore.setState({
      blocks: { b1: { id: 'b1', typeId: 't', weekKey: '2026-W32', dayIndex: 0, startSlot: 0, duration: 2 } },
      selectedBlockIds: ['b1'],
    });
    primerasBajadas();
    emitir(BLOQUES, [cambio('removed', 'b1')]);
    expect(useScheduleStore.getState().selectedBlockIds).toEqual([]);
  });

  it('lo que baja no entra al historial de deshacer', () => {
    primerasBajadas();
    useScheduleStore.temporal.getState().clear();
    emitir(BLOQUES, [cambio('added', 'r1', bloqueRemoto())]);
    expect(useScheduleStore.temporal.getState().pastStates).toHaveLength(0);
  });
});

describe('subida', () => {
  it('no escribe nada antes de la primera bajada — pisaría la nube con lo viejo', () => {
    useScheduleStore.setState({
      blocks: { b1: { id: 'b1', typeId: 't', weekKey: '2026-W32', dayIndex: 0, startSlot: 0, duration: 2 } },
    });
    vi.advanceTimersByTime(2000);
    expect(escrituras).toHaveLength(0);
  });

  it('después de la primera bajada sube lo que sólo está local', () => {
    primerasBajadas();
    useScheduleStore.setState({
      blocks: { b1: { id: 'b1', typeId: 't', weekKey: '2026-W32', dayIndex: 0, startSlot: 3, duration: 2 } },
    });
    vi.advanceTimersByTime(700);
    const doc = escrituras.find((e) => e.path === `${BLOQUES}/b1`);
    expect(doc?.data).toMatchObject({ typeId: 't', startSlot: 3, duration: 2 });
  });

  it('no manda undefined: Firestore lo rechaza', () => {
    primerasBajadas();
    useScheduleStore.setState({
      blocks: { b1: { id: 'b1', typeId: 't', weekKey: '2026-W32', dayIndex: 0, startSlot: 0, duration: 2 } },
    });
    vi.advanceTimersByTime(700);
    const doc = escrituras.find((e) => e.path === `${BLOQUES}/b1`)!;
    expect(Object.values(doc.data).some((v) => v === undefined)).toBe(false);
  });

  it('aplicar una bajada no rebota como subida', () => {
    primerasBajadas([cambio('added', 'r1', bloqueRemoto())]);
    vi.advanceTimersByTime(700);
    expect(escrituras.filter((e) => e.path === `${BLOQUES}/r1`)).toHaveLength(0);
  });

  it('borrar local borra en la nube', () => {
    primerasBajadas([cambio('added', 'r1', bloqueRemoto())]);
    vi.advanceTimersByTime(700);
    useScheduleStore.setState({ blocks: {} });
    vi.advanceTimersByTime(700);
    expect(borrados).toContain(`${BLOQUES}/r1`);
  });

  it('un cambio sin cambios reales no vuelve a escribir', () => {
    primerasBajadas();
    useScheduleStore.setState({
      blocks: { b1: { id: 'b1', typeId: 't', weekKey: '2026-W32', dayIndex: 0, startSlot: 0, duration: 2 } },
    });
    vi.advanceTimersByTime(700);
    const antes = escrituras.filter((e) => e.path === `${BLOQUES}/b1`).length;
    useScheduleStore.setState({ selectedBlockIds: ['b1'] }); // toca el store, no los datos
    vi.advanceTimersByTime(700);
    expect(escrituras.filter((e) => e.path === `${BLOQUES}/b1`)).toHaveLength(antes);
  });

  it('deja de escribir después de cortar', () => {
    primerasBajadas();
    cortar();
    useScheduleStore.setState({
      blocks: { b1: { id: 'b1', typeId: 't', weekKey: '2026-W32', dayIndex: 0, startSlot: 0, duration: 2 } },
    });
    vi.advanceTimersByTime(2000);
    expect(escrituras.filter((e) => e.path.startsWith(BLOQUES))).toHaveLength(0);
  });
});
