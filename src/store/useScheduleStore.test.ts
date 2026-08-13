import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScheduleStore } from './useScheduleStore';
import { DEFAULT_BLOCK_TYPES, SLOT_COUNT } from '../lib/constants';
import type { BlockType } from '../types';

const TEST_WEEK = '2026-W23';
const OTHER_WEEK = '2026-W24';

function freshBlockTypes(): Record<string, BlockType> {
  return Object.fromEntries(DEFAULT_BLOCK_TYPES.map((t) => [t.id, t]));
}

beforeEach(() => {
  localStorage.clear();
  useScheduleStore.setState({
    blocks: {},
    blockTypes: freshBlockTypes(),
    blockTypeOrder: DEFAULT_BLOCK_TYPES.map((t) => t.id),
    currentWeekKey: TEST_WEEK,
    selectedBlockIds: [],
    clipboardSelection: null,
    clipboardWeek: null,
    activeModal: null,
    modalContext: null,
    aviso: null,
  });
});

describe('addBlock', () => {
  it('devuelve el id nuevo y crea el bloque en el store', () => {
    const id = useScheduleStore.getState().addBlock({
      typeId: 'trabajo',
      weekKey: TEST_WEEK,
      dayIndex: 0,
      startSlot: 4,
      duration: 2,
    });

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);

    const block = useScheduleStore.getState().blocks[id];
    expect(block).toBeDefined();
    expect(block.id).toBe(id);
    expect(block.dayIndex).toBe(0);
    expect(block.startSlot).toBe(4);
    expect(block.duration).toBe(2);
  });

  it('recorta el bloque nuevo si se pasa de la grilla', () => {
    const id = useScheduleStore.getState().addBlock({
      typeId: 'trabajo',
      weekKey: TEST_WEEK,
      dayIndex: 0,
      startSlot: 0,
      duration: 999,
    });
    expect(useScheduleStore.getState().blocks[id].duration).toBe(SLOT_COUNT);
  });
});

describe('moveBlock', () => {
  it('actualiza día, slot y weekKey del bloque', () => {
    const id = useScheduleStore.getState().addBlock({
      typeId: 'trabajo',
      weekKey: TEST_WEEK,
      dayIndex: 0,
      startSlot: 0,
      duration: 2,
    });

    useScheduleStore.getState().moveBlock(id, 3, 10);

    const block = useScheduleStore.getState().blocks[id];
    expect(block.dayIndex).toBe(3);
    expect(block.startSlot).toBe(10);
    expect(block.weekKey).toBe(TEST_WEEK);
  });

  it('recorta el slot destino si se sale de la grilla', () => {
    const id = useScheduleStore.getState().addBlock({
      typeId: 'trabajo',
      weekKey: TEST_WEEK,
      dayIndex: 0,
      startSlot: 0,
      duration: 2,
    });

    useScheduleStore.getState().moveBlock(id, 1, 500);

    const block = useScheduleStore.getState().blocks[id];
    expect(block.startSlot).toBe(SLOT_COUNT - 1);
    expect(block.duration).toBe(1);
  });

  it('no hace nada si el id no existe', () => {
    const before = useScheduleStore.getState().blocks;
    useScheduleStore.getState().moveBlock('no-existe', 2, 5);
    expect(useScheduleStore.getState().blocks).toBe(before);
  });
});

describe('resizeBlock', () => {
  it('actualiza la duración', () => {
    const id = useScheduleStore.getState().addBlock({
      typeId: 'trabajo',
      weekKey: TEST_WEEK,
      dayIndex: 0,
      startSlot: 10,
      duration: 3,
    });
    useScheduleStore.getState().resizeBlock(id, 5);
    expect(useScheduleStore.getState().blocks[id].duration).toBe(5);
  });

  it('nunca baja de 1 slot de duración', () => {
    const id = useScheduleStore.getState().addBlock({
      typeId: 'trabajo',
      weekKey: TEST_WEEK,
      dayIndex: 0,
      startSlot: 10,
      duration: 3,
    });

    useScheduleStore.getState().resizeBlock(id, 0);
    expect(useScheduleStore.getState().blocks[id].duration).toBe(1);

    useScheduleStore.getState().resizeBlock(id, -5);
    expect(useScheduleStore.getState().blocks[id].duration).toBe(1);
  });
});

describe('copyWeek / pasteWeek', () => {
  it('pastea (merge) los bloques copiados en otra semana con ids nuevos', () => {
    useScheduleStore.getState().addBlock({
      typeId: 'trabajo',
      weekKey: TEST_WEEK,
      dayIndex: 0,
      startSlot: 2,
      duration: 2,
    });
    useScheduleStore.getState().addBlock({
      typeId: 'estudio',
      weekKey: TEST_WEEK,
      dayIndex: 1,
      startSlot: 4,
      duration: 1,
    });

    useScheduleStore.getState().copyWeek();
    useScheduleStore.setState({ currentWeekKey: OTHER_WEEK });
    useScheduleStore.getState().pasteWeek('merge');

    const sourceBlocks = Object.values(useScheduleStore.getState().blocks).filter(
      (b) => b.weekKey === TEST_WEEK,
    );
    const pastedBlocks = Object.values(useScheduleStore.getState().blocks).filter(
      (b) => b.weekKey === OTHER_WEEK,
    );

    expect(sourceBlocks).toHaveLength(2); // la semana origen queda intacta
    expect(pastedBlocks).toHaveLength(2);
    expect(pastedBlocks.map((b) => b.dayIndex).sort()).toEqual([0, 1]);
    // ids nuevos: ningún pegado reutiliza el id de origen
    const sourceIds = new Set(sourceBlocks.map((b) => b.id));
    for (const b of pastedBlocks) expect(sourceIds.has(b.id)).toBe(false);
  });

  it('con mode "replace" borra antes los bloques existentes de la semana destino', () => {
    useScheduleStore.getState().addBlock({
      typeId: 'trabajo',
      weekKey: TEST_WEEK,
      dayIndex: 0,
      startSlot: 2,
      duration: 2,
    });
    useScheduleStore.getState().copyWeek();

    // bloque preexistente en la semana destino: debe desaparecer con "replace"
    useScheduleStore.getState().addBlock({
      typeId: 'desayuno',
      weekKey: OTHER_WEEK,
      dayIndex: 5,
      startSlot: 0,
      duration: 1,
    });

    useScheduleStore.setState({ currentWeekKey: OTHER_WEEK });
    useScheduleStore.getState().pasteWeek('replace');

    const destBlocks = Object.values(useScheduleStore.getState().blocks).filter(
      (b) => b.weekKey === OTHER_WEEK,
    );
    expect(destBlocks).toHaveLength(1);
    expect(destBlocks[0].typeId).toBe('trabajo');
  });

  it('pasteWeek no hace nada si no hay nada copiado', () => {
    useScheduleStore.setState({ currentWeekKey: OTHER_WEEK });
    useScheduleStore.getState().pasteWeek('merge');
    expect(Object.keys(useScheduleStore.getState().blocks)).toHaveLength(0);
  });
});

describe('moverDia', () => {
  const conDias = (mobileDayIndex: number, showWeekends: boolean) =>
    useScheduleStore.setState((s) => ({
      mobileDayIndex,
      currentWeekKey: TEST_WEEK,
      settings: { ...s.settings, showWeekends },
    }));

  it('avanza dentro de la semana sin tocar la semana', () => {
    conDias(2, true);
    useScheduleStore.getState().moverDia(1);
    expect(useScheduleStore.getState().mobileDayIndex).toBe(3);
    expect(useScheduleStore.getState().currentWeekKey).toBe(TEST_WEEK);
  });

  // Lo que se pidió: correr todos los días que haga falta sin frenarse.
  it('pasando el domingo entra por el lunes de la semana siguiente', () => {
    conDias(6, true);
    useScheduleStore.getState().moverDia(1);
    expect(useScheduleStore.getState().mobileDayIndex).toBe(0);
    expect(useScheduleStore.getState().currentWeekKey).toBe(OTHER_WEEK);
  });

  it('antes del lunes entra por el domingo de la semana anterior', () => {
    conDias(0, true);
    useScheduleStore.getState().moverDia(-1);
    expect(useScheduleStore.getState().mobileDayIndex).toBe(6);
    expect(useScheduleStore.getState().currentWeekKey).toBe('2026-W22');
  });

  it('sin fines de semana el borde es el viernes', () => {
    conDias(4, false);
    useScheduleStore.getState().moverDia(1);
    expect(useScheduleStore.getState().mobileDayIndex).toBe(0);
    expect(useScheduleStore.getState().currentWeekKey).toBe(OTHER_WEEK);
  });

  it('ida y vuelta deja todo como estaba', () => {
    conDias(6, true);
    useScheduleStore.getState().moverDia(1);
    useScheduleStore.getState().moverDia(-1);
    expect(useScheduleStore.getState().mobileDayIndex).toBe(6);
    expect(useScheduleStore.getState().currentWeekKey).toBe(TEST_WEEK);
  });

  it('suelta la selección: la barra de acciones no puede quedar sobre otro día', () => {
    conDias(2, true);
    useScheduleStore.setState({ selectedBlockIds: ['x'] });
    useScheduleStore.getState().moverDia(1);
    expect(useScheduleStore.getState().selectedBlockIds).toEqual([]);
  });
});

describe('goToToday', () => {
  it('lleva a la semana actual Y al día de hoy, no al lunes', () => {
    useScheduleStore.setState((s) => ({
      currentWeekKey: '2020-W01',
      mobileDayIndex: 0,
      settings: { ...s.settings, showWeekends: true },
    }));
    useScheduleStore.getState().goToToday();

    const hoy = (new Date().getDay() + 6) % 7;
    expect(useScheduleStore.getState().mobileDayIndex).toBe(hoy);
    expect(useScheduleStore.getState().currentWeekKey).not.toBe('2020-W01');
  });

  it('con los fines de semana apagados no se pasa del viernes', () => {
    useScheduleStore.setState((s) => ({
      mobileDayIndex: 0,
      settings: { ...s.settings, showWeekends: false },
    }));
    useScheduleStore.getState().goToToday();
    expect(useScheduleStore.getState().mobileDayIndex).toBeLessThanOrEqual(4);
  });
});

describe('historial de deshacer', () => {
  afterEach(() => vi.restoreAllMocks());

  it('ignora los set que no tocan los datos', () => {
    useScheduleStore.temporal.getState().clear();

    // El historial descarta los set que llegan a menos de 400 ms del anterior,
    // y ese throttle taparía lo que se quiere medir: sin adelantar el reloj el
    // test pasaría igual aunque `equality` no existiera.
    let ahora = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => (ahora += 1000));

    useScheduleStore.getState().setSelectedBlock(null);
    useScheduleStore.getState().openModal('createType');
    useScheduleStore.getState().closeModal();
    useScheduleStore.getState().navigateWeek('next');
    useScheduleStore.getState().mostrarAviso('Bloque borrado');
    useScheduleStore.getState().ocultarAviso();

    expect(useScheduleStore.temporal.getState().pastStates.length).toBe(0);
  });

  it('guarda un paso cuando los datos sí cambian', () => {
    useScheduleStore.temporal.getState().clear();
    let ahora = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => (ahora += 1000));

    const id = useScheduleStore.getState().addBlock({
      typeId: 'trabajo',
      weekKey: TEST_WEEK,
      dayIndex: 0,
      startSlot: 4,
      duration: 2,
    });
    expect(useScheduleStore.temporal.getState().pastStates.length).toBe(1);

    useScheduleStore.getState().deleteBlock(id);
    expect(useScheduleStore.temporal.getState().pastStates.length).toBe(2);

    // Deshacer tiene que devolver el bloque en el PRIMER intento: el aviso que
    // acompaña al borrado no puede haber metido un paso vacío en el medio.
    useScheduleStore.temporal.getState().undo();
    expect(useScheduleStore.getState().blocks[id]).toBeDefined();
  });
});

describe('avisos', () => {
  it('borrar deja un aviso con opción de deshacer', () => {
    const id = useScheduleStore.getState().addBlock({
      typeId: 'trabajo',
      weekKey: TEST_WEEK,
      dayIndex: 0,
      startSlot: 4,
      duration: 2,
    });
    useScheduleStore.getState().deleteBlock(id);

    const aviso = useScheduleStore.getState().aviso;
    expect(aviso?.texto).toBe('Bloque borrado');
    expect(aviso?.deshacer).toBe(true);
  });

  it('cuenta los bloques cuando se borra una selección', () => {
    const ids = [4, 8].map((startSlot) =>
      useScheduleStore.getState().addBlock({
        typeId: 'trabajo',
        weekKey: TEST_WEEK,
        dayIndex: 0,
        startSlot,
        duration: 2,
      }),
    );
    useScheduleStore.setState({ selectedBlockIds: ids });
    useScheduleStore.getState().deleteSelectedBlocks();

    expect(useScheduleStore.getState().aviso?.texto).toBe('2 bloques borrados');
  });

  it('borrar nada no deja aviso', () => {
    useScheduleStore.getState().deleteBlock('no-existe');
    expect(useScheduleStore.getState().aviso).toBeNull();

    useScheduleStore.getState().deleteSelectedBlocks();
    expect(useScheduleStore.getState().aviso).toBeNull();
  });

  it('el id cambia en cada aviso para que el temporizador arranque de nuevo', () => {
    useScheduleStore.getState().mostrarAviso('Bloque borrado');
    const primero = useScheduleStore.getState().aviso?.id;
    useScheduleStore.getState().mostrarAviso('Bloque borrado');

    expect(useScheduleStore.getState().aviso?.id).not.toBe(primero);
  });
});
