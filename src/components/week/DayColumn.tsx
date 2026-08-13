import { useMemo } from 'react';
import type { ResolvedBlock } from '../../types';
import { TIME_SLOTS } from '../../lib/constants';
import { hourToSlot } from '../../lib/constants';
import { computeBlockLayout } from '../../lib/blockUtils';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import { EmptySlot } from '../blocks/EmptySlot';
import { ScheduleBlock } from '../blocks/ScheduleBlock';
import { CurrentTimeLine } from './CurrentTimeLine';

interface DayColumnProps {
  dayIndex: number;
  blocks: ResolvedBlock[];
  isToday?: boolean;
  /** Id del bloque recién creado por drop lateral — le aplica la animación de entrada */
  justDroppedBlockId: string | null;
}

export function DayColumn({ dayIndex, blocks, isToday, justDroppedBlockId }: DayColumnProps) {
  const { visibleStartHour, visibleEndHour, slotHeightPx } = useScheduleStore(
    (s) => s.settings,
  );
  const currentTime = useCurrentTime();

  const visibleStartSlot = hourToSlot(visibleStartHour);
  const visibleEndSlot = hourToSlot(visibleEndHour) - 1;
  const visibleSlots = TIME_SLOTS.slice(visibleStartSlot, visibleEndSlot + 1);

  const visibleBlocks = blocks.filter(
    (b) => b.startSlot <= visibleEndSlot && b.startSlot + b.duration > visibleStartSlot,
  );

  const layoutMap = useMemo(() => computeBlockLayout(blocks), [blocks]);

  return (
    <div
      className={`relative border-l border-gray-100 dark:border-gray-800 ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}
      style={{
        display: 'grid',
        gridTemplateRows: `repeat(${visibleSlots.length}, ${slotHeightPx}px)`,
        gridTemplateColumns: '1fr',
      }}
    >
      {visibleSlots.map((slot, i) => (
        <EmptySlot
          key={slot.index}
          dayIndex={dayIndex}
          slotIndex={slot.index}
          gridRow={i + 1}
        />
      ))}

      {visibleBlocks.map((block) => (
        <ScheduleBlock
          key={block.id}
          block={block}
          layout={layoutMap.get(block.id) ?? { layer: 0, layerCount: 1 }}
          visibleStartSlot={visibleStartSlot}
          visibleEndSlot={visibleEndSlot}
          animateIn={block.id === justDroppedBlockId}
          // Sólo los de hoy: atenuar días enteros ya pasados haría ver rota
          // cualquier semana anterior que se abra para consultarla. La cuenta
          // sale acá y no en ScheduleBlock para no montar un intervalo de 30 s
          // por cada bloque de la grilla.
          terminado={isToday && block.startSlot + block.duration <= currentTime.slot}
        />
      ))}

      {isToday &&
        currentTime.slot >= visibleStartSlot &&
        currentTime.slot <= visibleEndSlot && (
          <CurrentTimeLine
            slot={currentTime.slot}
            offsetPct={currentTime.offsetPct}
            visibleStartSlot={visibleStartSlot}
            slotHeightPx={slotHeightPx}
          />
        )}
    </div>
  );
}
