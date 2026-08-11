import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

import { useCopyPaste } from '../../hooks/useCopyPaste';
import { useBlockAlerts } from '../../hooks/useBlockAlerts';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useFullscreenAlAbrir } from '../../hooks/useFullscreenAlAbrir';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useCurrentWeekBlocks } from '../../store/selectors';
import { useScheduleStore } from '../../store/useScheduleStore';
import { topEdgeClosestCenter } from '../../lib/collisionDetection';

import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { BlockTypeSidebar } from '../sidebar/BlockTypeSidebar';
import { WeekGrid } from '../week/WeekGrid';
import { ModalManager } from '../modals/ModalManager';
import { BlockAlertModal } from '../modals/BlockAlertModal';
import { BlockDragOverlay } from '../blocks/BlockDragOverlay';
import { BlockTypeDragOverlay } from '../blocks/BlockTypeDragOverlay';
import { BlockActionBar } from '../blocks/BlockActionBar';

const TIME_COL_WIDTH = 56;
const MAIN_PADDING = 40; // p-5 (20px izq + 20px der)

/** Cuánto dura la cinemática completa, contando la demora de la última pieza. */
const INTRO_MS = 550;

/**
 * Fuera del componente a propósito: la cinemática es "al abrir la app", y
 * AppShell se vuelve a montar cada vez que se va y se vuelve de Ajustes. Con
 * un `useState` la animación se repetiría en cada ida y vuelta, que es
 * exactamente lo que cansa de este tipo de efectos. Al recargar se resetea
 * solo, que es cuando corresponde volver a verla.
 */
let yaSeVioLaIntro = false;

/**
 * Shell principal de la app.
 *
 * El DndContext vive aquí (no en WeekGrid) para que los chips de la
 * barra lateral sean draggables aunque estén fuera de la grilla.
 * Soporta dos tipos de arrastre:
 *  - 'block'      → mover un bloque ya existente en la grilla.
 *  - 'block-type' → arrastrar un tipo desde la sidebar para crear un bloque.
 */
export function AppShell() {
  useCopyPaste();
  const blocks = useCurrentWeekBlocks();
  const soundEnabled = useScheduleStore((s) => s.settings.soundEnabled);
  const showWeekends = useScheduleStore((s) => s.settings.showWeekends);
  const blockTypes = useScheduleStore((s) => s.blockTypes);
  const { alert, dismissAlert } = useBlockAlerts(blocks);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const introAnimation = useScheduleStore((s) => s.settings.introAnimation);
  const fullscreenOnOpen = useScheduleStore((s) => s.settings.fullscreenOnOpen);
  const { isSupported: fullscreenSoportado, enter: entrarFullscreen } = useFullscreen();
  useFullscreenAlAbrir({
    activo: fullscreenOnOpen,
    soportado: fullscreenSoportado,
    entrar: entrarFullscreen,
  });

  const [intro, setIntro] = useState(() => introAnimation && !yaSeVioLaIntro);
  useEffect(() => {
    if (!intro) return;
    yaSeVioLaIntro = true;
    // La clase se saca cuando termina. Si quedara puesta, cualquier cambio de
    // layout que reinicie la animación la volvería a disparar.
    const t = setTimeout(() => setIntro(false), INTRO_MS);
    return () => clearTimeout(t);
  }, [intro]);

  const { activeBlockId, activeBlockTypeId, justDroppedBlockId, handleDragStart, handleDragEnd, handleDragCancel } =
    useDragDrop();

  // Ancho de una columna de día — necesario para dimensionar BlockDragOverlay
  const mainRef = useRef<HTMLElement>(null);
  const [dayWidth, setDayWidth] = useState(120);
  const dayCount = showWeekends ? 7 : 5;

  useLayoutEffect(() => {
    const measure = () => {
      if (!mainRef.current) return;
      const gridWidth = mainRef.current.offsetWidth - MAIN_PADDING;
      setDayWidth(Math.max(60, (gridWidth - TIME_COL_WIDTH) / dayCount));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [dayCount]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Delay antes de iniciar el drag táctil para no competir con el scroll del dedo;
    // un toque corto sigue siendo tap (crear/seleccionar), uno sostenido arrastra.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const activeBlock = blocks.find((b) => b.id === activeBlockId) ?? null;
  const activeBlockType = activeBlockTypeId ? (blockTypes[activeBlockTypeId] ?? null) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={topEdgeClosestCenter}
      modifiers={[restrictToWindowEdges]}
      onDragStart={(e) => {
        // En móvil el drawer de tipos es `fixed inset-y-0 left-0 w-72`: tapa la
        // grilla entera, así que arrastrar un chip hasta un slot era imposible
        // —el destino quedaba debajo y nada lo cerraba—. Se cierra al empezar
        // el arrastre; el DragOverlay sigue mostrando el chip mientras viaja.
        setSidebarOpen(false);
        handleDragStart(e);
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className={`app-shell flex h-dvh flex-col bg-gray-50 dark:bg-gray-950${intro ? ' intro' : ''}`}
      >
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <div className="flex flex-1 overflow-hidden">
          <BlockTypeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main ref={mainRef} className="flex-1 overflow-auto p-2 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:p-5 lg:pb-5">
            <WeekGrid justDroppedBlockId={justDroppedBlockId} />
          </main>
        </div>
        <BlockActionBar />
        <MobileBottomNav active="calendar" />
        <ModalManager />
        {alert && (
          <BlockAlertModal
            blockName={alert.blockName}
            blockColor={alert.blockColor}
            textColor={alert.textColor}
            soundEnabled={soundEnabled}
            onClose={dismissAlert}
          />
        )}
      </div>

      {/* Overlays flotantes durante el arrastre */}
      <DragOverlay dropAnimation={null}>
        {activeBlock && (
          <BlockDragOverlay block={activeBlock} width={dayWidth - 2} />
        )}
        {activeBlockType && (
          <BlockTypeDragOverlay type={activeBlockType} />
        )}
      </DragOverlay>
    </DndContext>
  );
}
