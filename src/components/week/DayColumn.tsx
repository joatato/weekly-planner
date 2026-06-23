import type { ResolvedBlock } from '../../types';
import { TIME_SLOTS } from '../../lib/constants';
import { hourToSlot } from '../../lib/constants';
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
          visibleStartSlot={visibleStartSlot}
          visibleEndSlot={visibleEndSlot}
          animateIn={block.id === justDroppedBlockId}
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
