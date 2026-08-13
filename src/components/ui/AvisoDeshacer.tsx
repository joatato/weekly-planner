import { useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { responder } from '../../lib/sonidos';
import { cn } from '../../lib/cn';

/** Lo que queda en pantalla: suficiente para leerlo y decidir, corto para no
 *  quedar tapando la grilla. */
const DURACION_MS = 4500;

/**
 * Aviso al pie de lo que acaba de pasar, con la opción de deshacerlo.
 *
 * Existe por el teléfono. Deshacer vivía sólo en Ctrl+Z y en el kebab del
 * header, y sin teclado, para cuando encontrás "Deshacer" en el menú ya no
 * sabés si va a deshacer lo que borraste o lo de antes. Acá el botón aparece
 * al lado del hecho y dice cuál es.
 *
 * El aviso lo arma el store dentro del mismo `set` que la acción, así que
 * agregar uno nuevo es una línea en la acción que corresponda, no tocar esto.
 */
export function AvisoDeshacer() {
  const aviso = useScheduleStore((s) => s.aviso);
  const ocultarAviso = useScheduleStore((s) => s.ocultarAviso);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!aviso) {
      setVisible(false);
      return;
    }
    // Un frame en la posición inicial para que la transición tenga de dónde
    // salir: pintar directamente con la clase final no anima nada.
    const raf = requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(ocultarAviso, DURACION_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [aviso, ocultarAviso]);

  if (!aviso) return null;

  return (
    <div
      data-bloque="calendar.aviso"
      role="status"
      aria-live="polite"
      /* Mismo `bottom` que BlockActionBar para no quedar debajo de la nav
         inferior. No se pisan: todo lo que dispara un aviso suelta la
         selección, y sin selección la barra de acciones no se renderiza. */
      className={cn(
        'fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-50 mx-auto',
        'flex max-w-sm items-center gap-2 rounded-xl border border-gray-200 bg-white/95',
        'py-2 pl-4 pr-2 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95',
        'transition-all duration-200 lg:bottom-6',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      <span className="flex-1 truncate text-sm text-gray-700 dark:text-gray-200">
        {aviso.texto}
      </span>

      {aviso.deshacer && (
        <button
          type="button"
          onClick={() => {
            useScheduleStore.temporal.getState().undo();
            responder('deshacer');
            ocultarAviso();
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
        >
          <Undo2 size={15} />
          Deshacer
        </button>
      )}
    </div>
  );
}
