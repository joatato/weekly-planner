import { useLayoutEffect, useRef, useState } from 'react';
import { isToday } from 'date-fns';

import { useCurrentWeekBlocks } from '../../store/selectors';
import { useScheduleStore } from '../../store/useScheduleStore';
import { getWeekDates } from '../../lib/dateUtils';

import { TimeColumn } from './TimeColumn';
import { DayColumn } from './DayColumn';
import { DayHeader } from './DayHeader';

const TIME_COL_WIDTH = 56;

interface WeekGridProps {
  /** Id del bloque recién creado por drop lateral — dispara su animación de entrada */
  justDroppedBlockId: string | null;
}

export function WeekGrid({ justDroppedBlockId }: WeekGridProps) {
  const currentWeekKey = useScheduleStore((s) => s.currentWeekKey);
  const blocks = useCurrentWeekBlocks();
  const setSelectedBlock = useScheduleStore((s) => s.setSelectedBlock);
  const showWeekends = useScheduleStore((s) => s.settings.showWeekends);

  const dates = getWeekDates(currentWeekKey);

  const dayCount = showWeekends ? 7 : 5;
  const visibleDates = dates.slice(0, dayCount);

  const gridRef = useRef<HTMLDivElement>(null);
  const [, setDayWidth] = useState(120); // sólo para re-render ante resize
  useLayoutEffect(() => {
    const measure = () => {
      if (!gridRef.current) return;
      const w = gridRef.current.offsetWidth - TIME_COL_WIDTH;
      setDayWidth(Math.max(60, w / dayCount));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [dayCount]);

  const blocksByDay = Array.from({ length: dayCount }, (_, day) =>
    blocks.filter((b) => b.dayIndex === day),
  );

  return (
    <div
      ref={gridRef}
      className="min-w-[820px] rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      onClick={() => setSelectedBlock(null)}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(${dayCount}, minmax(0, 1fr))`,
        }}
      >
        {/* Fila de cabecera */}
        <div className="sticky top-0 z-30 rounded-tl-xl border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95" />
        {visibleDates.map((date, day) => (
          <div
            key={day}
            className={`sticky top-0 z-30 border-b border-l border-gray-100 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 ${
              day === dayCount - 1 ? 'rounded-tr-xl' : ''
            }`}
          >
            <DayHeader dayIndex={day} date={date} />
          </div>
        ))}

        {/* Cuerpo */}
        <div className="pt-2">
          <TimeColumn />
        </div>
        {blocksByDay.map((dayBlocks, day) => (
          <div key={day} className="pt-2">
            <DayColumn
              dayIndex={day}
              blocks={dayBlocks}
              isToday={isToday(visibleDates[day])}
              justDroppedBlockId={justDroppedBlockId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
