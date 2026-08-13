import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronLeft } from 'lucide-react';
import type { BlockType, RespuestaAlarma } from '../../types';
import { darkenColor } from '../../lib/blockUtils';
import { cn } from '../../lib/cn';

interface BlockAlertModalProps {
  blockName: string;
  blockColor: string;
  textColor: string;
  /** Es el bucle volviendo a preguntar, no el arranque del bloque. */
  esSeguimiento: boolean;
  tipos: BlockType[];
  soundEnabled: boolean;
  onResponder: (respuesta: RespuestaAlarma) => void;
  onCerrar: () => void;
}

/** Genera un tono de alerta usando Web Audio API. Retorna una función para detenerlo. */
function startAlertSound(): () => void {
  const ctx = new AudioContext();

  let stopped = false;
  let timeout: ReturnType<typeof setTimeout>;

  function playBeep() {
    if (stopped) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    timeout = setTimeout(playBeep, 1200);
  }

  playBeep();

  return () => {
    stopped = true;
    clearTimeout(timeout);
    ctx.close();
  };
}

/**
 * La alarma del bloque. No avisa: pregunta, y la respuesta es lo que llena la
 * capa real. "Estoy con otra cosa" abre la lista de tipos — es lo que hace que
 * el registro sirva justo cuando te desviaste del plan, que es cuando importa.
 */
export function BlockAlertModal({
  blockName,
  blockColor,
  textColor,
  esSeguimiento,
  tipos,
  soundEnabled,
  onResponder,
  onCerrar,
}: BlockAlertModalProps) {
  const stopSoundRef = useRef<(() => void) | null>(null);
  const [eligiendoTipo, setEligiendoTipo] = useState(false);

  useEffect(() => {
    if (soundEnabled) {
      stopSoundRef.current = startAlertSound();
    }
    return () => {
      stopSoundRef.current?.();
    };
  }, [soundEnabled]);

  const responder = (respuesta: RespuestaAlarma) => {
    stopSoundRef.current?.();
    onResponder(respuesta);
  };

  return (
    <div
      data-bloque="calendar.alarma"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ backgroundColor: blockColor, color: textColor }}
        >
          <Bell size={22} className="shrink-0" />
          <span className="text-base font-bold">
            {esSeguimiento ? '¿Seguís con esto?' : 'Empieza un bloque'}
          </span>
        </div>

        {eligiendoTipo ? (
          <>
            <div className="flex items-center gap-2 px-5 pt-4">
              <button
                onClick={() => setEligiendoTipo(false)}
                aria-label="Volver"
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ChevronLeft size={18} />
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400">¿Qué estás haciendo?</p>
            </div>
            <div className="max-h-64 overflow-y-auto px-5 py-3">
              <div className="flex flex-col gap-1">
                {tipos.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => responder({ tipo: 'otro', typeId: t.id })}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded border"
                      style={{
                        backgroundColor: t.color,
                        borderColor: darkenColor(t.color, 0.18),
                      }}
                    />
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {esSeguimiento ? 'Seguís en:' : 'Ahora comienza:'}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
                {blockName}
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
              <button
                onClick={() => responder({ tipo: 'plan' })}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
              >
                {esSeguimiento ? 'Sí, sigo' : 'Lo estoy haciendo'}
              </button>
              <button
                onClick={() => setEligiendoTipo(true)}
                className={cn(
                  'w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors',
                  'hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800',
                )}
              >
                Estoy con otra cosa
              </button>
              <button
                onClick={() => responder({ tipo: 'nada' })}
                className="w-full rounded-xl py-2 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                {esSeguimiento ? 'No, ya terminé' : 'No estoy haciendo nada'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Cerrar sin contestar: vuelve a preguntar en el próximo tic. */}
      <button
        className="absolute inset-0 -z-10"
        aria-label="Cerrar sin contestar"
        onClick={onCerrar}
      />
    </div>
  );
}
