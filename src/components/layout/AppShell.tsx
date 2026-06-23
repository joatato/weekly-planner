import { useLayoutEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

import { useCopyPaste } from '../../hooks/useCopyPaste';
import { useBlockAlerts } from '../../hooks/useBlockAlerts';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useCurrentWeekBlocks } from '../../store/selectors';
import { useScheduleStore } from '../../store/useScheduleStore';
import { topEdgeClosestCenter } from '../../lib/collisionDetection';

import { Header } from './Header';
import { BlockTypeSidebar } from '../sidebar/BlockTypeSidebar';
import { WeekGrid } from '../week/WeekGrid';
import { ModalManager } from '../modals/ModalManager';
import { BlockAlertModal } from '../modals/BlockAlertModal';
import { BlockDragOverlay } from '../blocks/BlockDragOverlay';
import { BlockTypeDragOverlay } from '../blocks/BlockTypeDragOverlay';

const TIME_COL_WIDTH = 56;
const MAIN_PADDING = 40; // p-5 (20px izq + 20px der)

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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeBlock = blocks.find((b) => b.id === activeBlockId) ?? null;
  const activeBlockType = activeBlockTypeId ? (blockTypes[activeBlockTypeId] ?? null) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={topEdgeClosestCenter}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="app-shell flex h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <BlockTypeSidebar />
          <main ref={mainRef} className="flex-1 overflow-auto p-5">
            <WeekGrid justDroppedBlockId={justDroppedBlockId} />
          </main>
        </div>
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
