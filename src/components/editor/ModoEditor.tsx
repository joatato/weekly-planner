// Modo editor: resalta los bloques de la app y deja anotar qué cambiar.
//
// La regla de convivencia es que los clicks normales siguen funcionando con el
// modo prendido: si interceptara todo, habría que apagarlo para navegar hasta
// la pantalla que se quiere comentar. Se anota con Alt+Click, que no colisiona
// con nada de la app.
//
// En táctil NO hay pulsación larga: el TouchSensor de dnd-kit arranca a los
// 200 ms, así que a mitad del gesto el bloque ya se estaría arrastrando. En su
// lugar está el botón "Anotar", que arma una selección de un solo uso: el
// próximo toque elige el elemento en vez de hacer lo que haría normalmente.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, Copy, Crosshair, MousePointerClick, Save, X } from 'lucide-react';

import { useEditorStore } from '../../store/useEditorStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { bloqueDe, identificar } from '../../lib/bloques';
import type { Identidad } from '../../lib/bloques';
import { capturaDisponible, prepararCaptura, tomarCaptura } from '../../lib/captura';
import { construirMarkdown, ETIQUETAS, guardarNota } from '../../lib/notas';
import type { Entrega, Etiqueta, Nota } from '../../lib/notas';
import { anotarRuta, iniciarRegistro, leerPasos } from '../../lib/registroPasos';
import { cn } from '../../lib/cn';

export function ModoEditor() {
  const activo = useEditorStore((s) => s.activo);
  const armado = useEditorStore((s) => s.armado);
  const alternar = useEditorStore((s) => s.alternar);
  const poner = useEditorStore((s) => s.poner);
  const armar = useEditorStore((s) => s.armar);

  // No hay rutas: la app conmuta entre 'calendar' y 'settings' con currentView.
  const vista = useScheduleStore((s) => s.currentView);

  const [rectHover, setRectHover] = useState<DOMRect | null>(null);
  const [nombreHover, setNombreHover] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Identidad | null>(null);
  const [rectSeleccion, setRectSeleccion] = useState<DOMRect | null>(null);
  const [texto, setTexto] = useState('');
  const [etiqueta, setEtiqueta] = useState<Etiqueta>('molesta');
  const [copiado, setCopiado] = useState(false);
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [conCaptura, setConCaptura] = useState(false);

  const elHover = useRef<Element | null>(null);
  const elSeleccion = useRef<Element | null>(null);
  const tragarProximoClick = useRef(false);

  // El registro de pasos corre siempre, con el modo apagado también: uno se da
  // cuenta de que algo está mal después de que pasó, no antes.
  useEffect(() => iniciarRegistro(), []);
  useEffect(() => {
    anotarRuta(vista);
  }, [vista]);

  // ─── Atajo global: siempre escuchando, es la única forma de prenderlo ──────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        alternar();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alternar]);

  const seleccionar = useCallback(
    (el: Element) => {
      const contenedor = bloqueDe(el) ?? el;
      elSeleccion.current = contenedor;
      setSeleccion(identificar(el));
      setRectSeleccion(contenedor.getBoundingClientRect());
      setTexto('');
      setEtiqueta('molesta');
      setCopiado(false);
      setEntrega(null);
      armar(false);
    },
    [armar],
  );

  const cerrarPanel = useCallback(() => {
    elSeleccion.current = null;
    setSeleccion(null);
    setRectSeleccion(null);
  }, []);

  // ─── Resaltado al pasar el mouse ──────────────────────────────────────────
  // `passive: true` y sin preventDefault, siempre: BlockResizeHandle maneja su
  // propio arrastre con listeners de pointermove/pointerup en window, fuera de
  // dnd-kit, y un preventDefault de acá le rompe el cálculo del resize.
  useEffect(() => {
    if (!activo || seleccion) return;
    let cuadro = 0;

    function alMover(e: PointerEvent) {
      if (cuadro) return;
      cuadro = requestAnimationFrame(() => {
        cuadro = 0;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const contenedor = el && !el.closest('[data-editor-ui]') ? bloqueDe(el) : null;
        elHover.current = contenedor;
        setRectHover(contenedor ? contenedor.getBoundingClientRect() : null);
        setNombreHover(contenedor?.dataset.bloque ?? null);
      });
    }

    window.addEventListener('pointermove', alMover, { passive: true });
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener('pointermove', alMover);
    };
  }, [activo, seleccion]);

  // El recuadro está en coordenadas de viewport, así que scrollear lo
  // desalinea. Se recalcula desde el elemento, que no se movió.
  useEffect(() => {
    if (!activo) return;
    function refrescar() {
      if (elHover.current) setRectHover(elHover.current.getBoundingClientRect());
      if (elSeleccion.current) setRectSeleccion(elSeleccion.current.getBoundingClientRect());
    }
    window.addEventListener('scroll', refrescar, { passive: true, capture: true });
    window.addEventListener('resize', refrescar);
    return () => {
      window.removeEventListener('scroll', refrescar, { capture: true });
      window.removeEventListener('resize', refrescar);
    };
  }, [activo]);

  // ─── Elegir el elemento: Alt+Click, o un toque con "Anotar" armado ─────────
  useEffect(() => {
    if (!activo) return;

    function esPropio(el: Element | null) {
      return !el || el.closest('[data-editor-ui]') != null;
    }

    // Alt+Click sobre un <a> dispara la descarga del navegador, así que hay que
    // frenarlo desde mousedown y no recién en el click. Frenarlo acá además
    // deja al MouseSensor de dnd-kit sin su evento de activación.
    function alPresionar(e: MouseEvent) {
      if ((!e.altKey && !armado) || esPropio(e.target as Element)) return;
      e.preventDefault();
      e.stopPropagation();
    }

    function alClick(e: MouseEvent) {
      const el = e.target as Element | null;
      if (esPropio(el)) return;
      if (tragarProximoClick.current) {
        // Viene de un toque que ya abrió el panel.
        tragarProximoClick.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if ((!e.altKey && !armado) || !el) return;
      e.preventDefault();
      e.stopPropagation();
      seleccionar(el);
    }

    // Solo con "Anotar" armado. Sin armar, el táctil es entero de la app: el
    // TouchSensor de dnd-kit necesita ver su touchstart para arrancar.
    function alTocar(e: TouchEvent) {
      if (!armado) return;
      const el = e.target as Element | null;
      if (esPropio(el) || !el) return;
      e.preventDefault();
      e.stopPropagation();
      tragarProximoClick.current = true;
      seleccionar(el);
    }

    window.addEventListener('mousedown', alPresionar, true);
    window.addEventListener('click', alClick, true);
    // `passive: false` explícito: en touchstart el default del navegador es
    // pasivo y sin esto el preventDefault se ignora.
    window.addEventListener('touchstart', alTocar, { capture: true, passive: false });
    return () => {
      window.removeEventListener('mousedown', alPresionar, true);
      window.removeEventListener('click', alClick, true);
      window.removeEventListener('touchstart', alTocar, true);
    };
  }, [activo, armado, seleccionar]);

  // ─── Escape: primero cierra el panel, después apaga el modo ───────────────
  useEffect(() => {
    if (!activo) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (seleccion) cerrarPanel();
      else if (armado) armar(false);
      else poner(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activo, seleccion, armado, cerrarPanel, armar, poner]);

  // Cambiar de vista deja la selección apuntando a un elemento que ya no está.
  // Se escucha el store en lugar de reaccionar con un efecto a `vista`: así no
  // se dispara en el montaje y no queda un setState en el cuerpo de un efecto.
  useEffect(
    () =>
      useScheduleStore.subscribe((estado, anterior) => {
        if (estado.currentView === anterior.currentView) return;
        cerrarPanel();
        setRectHover(null);
        elHover.current = null;
      }),
    [cerrarPanel],
  );

  if (!activo) return null;

  function notaActual(): Nota | null {
    if (!seleccion) return null;
    return {
      fecha: new Date().toISOString(),
      vista,
      pantalla: `${window.innerWidth}×${window.innerHeight}`,
      bloque: seleccion.bloque,
      elemento: seleccion.texto
        ? `\`<${seleccion.etiqueta}>\` · "${seleccion.texto}"`
        : `\`<${seleccion.etiqueta}>\``,
      etiqueta,
      texto,
      pasos: leerPasos(),
    };
  }

  async function copiar() {
    const nota = notaActual();
    if (!nota) return;
    try {
      await navigator.clipboard.writeText(construirMarkdown(nota));
      setCopiado(true);
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer desde acá; el texto
      // igual se puede reconstruir mirando el panel.
    }
  }

  async function guardar() {
    const nota = notaActual();
    if (!nota || guardando) return;
    setGuardando(true);
    try {
      // El permiso de compartir pantalla necesita el gesto del usuario, así
      // que la primera captura se pide recién acá, no al prender el modo.
      if (conCaptura && (await prepararCaptura())) {
        nota.imagen = await tomarCaptura();
      }
      setEntrega(await guardarNota(nota));
    } finally {
      setGuardando(false);
    }
  }

  const rectVisible = seleccion ? rectSeleccion : rectHover;
  const nombreVisible = seleccion ? seleccion.bloque : nombreHover;

  return (
    <>
      {/* Recuadro del bloque. No lleva data-editor-ui a propósito: es lo que
          hace entendible la captura. Y no recibe eventos: el mouse tiene que
          seguir llegando a la app que hay abajo. */}
      {rectVisible && (
        <div
          className="pointer-events-none fixed z-[68] rounded-lg ring-2 ring-indigo-500 bg-indigo-500/10"
          style={{
            top: rectVisible.top,
            left: rectVisible.left,
            width: rectVisible.width,
            height: rectVisible.height,
          }}
        >
          <span className="absolute -top-5 left-0 whitespace-nowrap rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
            {nombreVisible ?? 'sin nombre'}
          </span>
        </div>
      )}

      {/* Aviso de que el modo está prendido, con lo único que hay que saber. */}
      {!seleccion && (
        <div
          data-editor-ui
          className="fixed bottom-20 left-1/2 z-[70] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white shadow-lg dark:bg-gray-800 md:bottom-4"
        >
          <Crosshair size={14} className="shrink-0 text-indigo-400" />
          {armado ? (
            <span>Tocá lo que querés anotar</span>
          ) : (
            <span className="hidden sm:inline">
              <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-semibold">Alt</kbd> + click
              para anotar
            </span>
          )}

          <button
            type="button"
            onClick={() => armar(!armado)}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-full px-2 py-1 transition-colors',
              armado ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-white/15 hover:bg-white/25',
            )}
          >
            <MousePointerClick size={14} />
            {armado ? 'Cancelar' : 'Anotar'}
          </button>

          <button
            type="button"
            onClick={() => poner(false)}
            className="shrink-0 rounded-full p-1 transition-colors hover:bg-white/15"
            aria-label="Salir del modo editor"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Panel de la nota */}
      {seleccion && (
        <div
          data-editor-ui
          className="fixed inset-x-3 bottom-3 z-[70] max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700 md:inset-x-auto md:bottom-4 md:right-4 md:w-[24rem]"
        >
          <div className="sticky top-0 flex items-start justify-between gap-3 rounded-t-2xl border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Bloque
              </p>
              <p className="truncate text-base font-semibold text-gray-900 dark:text-gray-50">
                {seleccion.bloque ?? 'sin nombre'}
              </p>
            </div>
            <button
              type="button"
              onClick={cerrarPanel}
              aria-label="Cerrar"
              className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {seleccion.etiqueta}
              </span>
              {seleccion.texto && <span className="ml-2">“{seleccion.texto}”</span>}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {ETIQUETAS.map((e) => (
                <button
                  key={e.clave}
                  type="button"
                  onClick={() => setEtiqueta(e.clave)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    etiqueta === e.clave
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                  )}
                >
                  {e.emoji} {e.label}
                </button>
              ))}
            </div>

            <textarea
              autoFocus
              value={texto}
              onChange={(ev) => {
                setTexto(ev.target.value);
                setCopiado(false);
                setEntrega(null);
              }}
              rows={3}
              placeholder="¿Qué querés cambiar de este bloque?"
              className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50 dark:placeholder:text-gray-500"
            />

            {capturaDisponible() && (
              <button
                type="button"
                onClick={() => setConCaptura((v) => !v)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  conCaptura
                    ? 'bg-gray-50 text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700'
                    : 'text-gray-400 dark:text-gray-500',
                )}
              >
                <Camera size={16} className={conCaptura ? 'text-indigo-500' : ''} />
                <span className="flex-1 text-left">
                  {conCaptura ? 'Adjunta la captura de pantalla' : 'Sin captura'}
                </span>
                <span
                  className={cn(
                    'h-4 w-7 shrink-0 rounded-full transition-colors',
                    conCaptura ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700',
                  )}
                >
                  <span
                    className={cn(
                      'block h-3 w-3 translate-y-0.5 rounded-full bg-white transition-transform',
                      conCaptura ? 'translate-x-3.5' : 'translate-x-0.5',
                    )}
                  />
                </span>
              </button>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                {entrega ? <Check size={18} /> : <Save size={18} />}
                {guardando ? 'Guardando…' : entrega ? 'Guardada' : 'Guardar nota'}
              </button>
              <button
                type="button"
                onClick={copiar}
                title="Copiar al portapapeles"
                aria-label="Copiar al portapapeles"
                className="rounded-lg bg-gray-100 px-3 py-2.5 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {copiado ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            {entrega && (
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                {entrega.destino === 'disco'
                  ? `Escrita en ${entrega.detalle} — pedime "leé las notas"`
                  : entrega.destino === 'nube'
                    ? 'Subida a tu cuenta — pedime "leé las notas" desde la compu'
                    : entrega.destino === 'descarga'
                      ? `Descargada como ${entrega.detalle} — mandámela`
                      : 'Copiada al portapapeles — pegala en el chat'}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
