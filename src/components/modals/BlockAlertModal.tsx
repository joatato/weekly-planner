import { useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';

interface BlockAlertModalProps {
  blockName: string;
  blockColor: string;
  textColor: string;
  soundEnabled: boolean;
  onClose: () => void;
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

export function BlockAlertModal({
  blockName,
  blockColor,
  textColor,
  soundEnabled,
  onClose,
}: BlockAlertModalProps) {
  const stopSoundRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (soundEnabled) {
      stopSoundRef.current = startAlertSound();
    }
    return () => {
      stopSoundRef.current?.();
    };
  }, [soundEnabled]);

  const handleClose = () => {
    stopSoundRef.current?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Banda de color del bloque */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ backgroundColor: blockColor, color: textColor }}
        >
          <Bell size={22} className="shrink-0" />
          <span className="text-base font-bold">Bloque iniciado</span>
        </div>

        {/* Contenido */}
        <div className="px-5 py-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Ahora comienza:</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">{blockName}</p>
        </div>

        {/* Botón OK */}
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <button
            onClick={handleClose}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
