import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScheduleStore } from '../store/useScheduleStore';
import { _reiniciarParaTests, reproducir, vibrar } from './sonidos';

/** AudioContext de mentira: cuenta cuántos osciladores se arrancaron. */
function falsoAudioContext() {
  const arrancados: number[] = [];
  class FakeCtx {
    state = 'running';
    currentTime = 0;
    destination = {};
    resume = vi.fn();
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: (t: number) => arrancados.push(t),
        stop: vi.fn(),
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      };
    }
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
  return arrancados;
}

function ponerEfectos(activo: boolean) {
  useScheduleStore.setState((s) => ({ settings: { ...s.settings, soundEffects: activo } }));
}

describe('reproducir', () => {
  beforeEach(() => {
    _reiniciarParaTests();
    vi.restoreAllMocks();
  });

  it('no suena nada con los efectos apagados — es el default', () => {
    const arrancados = falsoAudioContext();
    ponerEfectos(false);
    reproducir('crear');
    expect(arrancados).toHaveLength(0);
  });

  it('suena con los efectos prendidos', () => {
    const arrancados = falsoAudioContext();
    ponerEfectos(true);
    reproducir('crear');
    expect(arrancados).toHaveLength(1);
  });

  it('el sonido de error son dos tonos, no uno', () => {
    const arrancados = falsoAudioContext();
    ponerEfectos(true);
    reproducir('error');
    expect(arrancados).toHaveLength(2);
  });

  // Sin esto, redimensionar dispara un tick por cada pointermove.
  it('descarta un sonido igual que llega pegado al anterior', () => {
    const arrancados = falsoAudioContext();
    ponerEfectos(true);
    reproducir('tick');
    reproducir('tick');
    reproducir('tick');
    expect(arrancados).toHaveLength(1);
  });

  it('el throttle es por sonido: dos distintos seguidos suenan los dos', () => {
    const arrancados = falsoAudioContext();
    ponerEfectos(true);
    reproducir('crear');
    reproducir('mover');
    expect(arrancados).toHaveLength(2);
  });

  it('vuelve a sonar cuando pasó el tiempo mínimo', () => {
    const arrancados = falsoAudioContext();
    ponerEfectos(true);
    let t = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => t);
    reproducir('tick');
    t += 100;
    reproducir('tick');
    expect(arrancados).toHaveLength(2);
  });
});

describe('vibrar', () => {
  beforeEach(() => _reiniciarParaTests());

  it('no vibra con los efectos apagados', () => {
    const vibrate = vi.fn();
    (navigator as unknown as { vibrate: unknown }).vibrate = vibrate;
    ponerEfectos(false);
    vibrar();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('vibra con los efectos prendidos', () => {
    const vibrate = vi.fn();
    (navigator as unknown as { vibrate: unknown }).vibrate = vibrate;
    ponerEfectos(true);
    vibrar(12);
    expect(vibrate).toHaveBeenCalledWith(12);
  });

  // iOS no expone la API. No puede tirar.
  it('no rompe si el navegador no tiene vibrate', () => {
    (navigator as unknown as { vibrate?: unknown }).vibrate = undefined;
    ponerEfectos(true);
    expect(() => vibrar()).not.toThrow();
  });
});
