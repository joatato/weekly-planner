import { useState, useCallback, useRef } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useScheduleStore } from '../store/useScheduleStore';
import { responder } from '../lib/sonidos';

/** Discriminated union del arrastre activo */
type ActiveDrag =
  | { kind: 'block'; blockId: string }
  | { kind: 'block-type'; blockTypeId: string }
  | null;

/**
 * Maneja el estado y los handlers del drag & drop.
 *
 * Soporta dos tipos de arrastre:
 *  - 'block'      → mover un bloque existente entre slots.
 *  - 'block-type' → arrastrar un tipo desde la barra lateral para
 *                   crear un bloque nuevo en el slot de destino.
 *
 * El id de cada droppable (EmptySlot) tiene formato "slot-{dayIndex}-{slotIndex}".
 */
export function useDragDrop() {
  const moveSelectedBlocks = useScheduleStore((s) => s.moveSelectedBlocks);
  const addBlock = useScheduleStore((s) => s.addBlock);
  const setSelectedBlock = useScheduleStore((s) => s.setSelectedBlock);
  const currentWeekKey = useScheduleStore((s) => s.currentWeekKey);

  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);

  /**
   * Id del bloque recién creado por arrastre desde la barra lateral.
   * Se usa para dispararle la animación de entrada; se limpia a los 400 ms.
   */
  const [justDroppedBlockId, setJustDroppedBlockId] = useState<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as
        | { type: string; blockId?: string; blockTypeId?: string }
        | undefined;

      if (data?.type === 'block' && data.blockId) {
        setActiveDrag({ kind: 'block', blockId: data.blockId });
        // Si ya forma parte de una selección múltiple, no la colapsamos a un solo bloque.
        const { selectedBlockIds } = useScheduleStore.getState();
        if (!selectedBlockIds.includes(data.blockId)) {
          setSelectedBlock(data.blockId);
        }
      } else if (data?.type === 'block-type' && data.blockTypeId) {
        setActiveDrag({ kind: 'block-type', blockTypeId: data.blockTypeId });
      }
    },
    [setSelectedBlock],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);
      if (!over) return;

      const slotData = over.data.current as
        | { dayIndex: number; slotIndex: number }
        | undefined;
      if (!slotData) return;

      const data = active.data.current as
        | { type: string; blockId?: string; blockTypeId?: string }
        | undefined;

      if (data?.type === 'block' && data.blockId) {
        // Mueve el bloque arrastrado y, si hay selección múltiple, el resto en bloque
        moveSelectedBlocks(data.blockId, slotData.dayIndex, slotData.slotIndex);
        responder('mover');
      } else if (data?.type === 'block-type' && data.blockTypeId) {
        // Crear nuevo bloque a partir del tipo arrastrado (duración 2 slots = 1 hora)
        const newId = addBlock({
          typeId: data.blockTypeId,
          weekKey: currentWeekKey,
          dayIndex: slotData.dayIndex,
          startSlot: slotData.slotIndex,
          duration: 2,
        });
        setSelectedBlock(newId);
        // Un toque más largo que en `mover`: crear algo se siente más que
        // cambiarlo de lugar, y el gesto termina acá.
        responder('crear', 15);

        // Disparar animación de entrada; limpiar tras completarse
        setJustDroppedBlockId(newId);
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => setJustDroppedBlockId(null), 400);
      }
    },
    [moveSelectedBlocks, addBlock, currentWeekKey, setSelectedBlock],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
  }, []);

  return {
    /** Id del bloque existente que se está arrastrando (para el overlay) */
    activeBlockId: activeDrag?.kind === 'block' ? activeDrag.blockId : null,
    /** Id del tipo de bloque que se está arrastrando desde la sidebar */
    activeBlockTypeId: activeDrag?.kind === 'block-type' ? activeDrag.blockTypeId : null,
    /** Id del bloque recién creado por drop; se usa para la animación de entrada */
    justDroppedBlockId,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
