import { TIME_SLOTS, hourToSlot } from '../../lib/constants';
import { formatTimeLabel } from '../../lib/dateUtils';
import { useScheduleStore } from '../../store/useScheduleStore';

export function TimeColumn() {
  const { visibleStartHour, visibleEndHour, slotHeightPx, hourFormat } = useScheduleStore(
    (s) => s.settings,
  );

  const visibleStartSlot = hourToSlot(visibleStartHour);
  const visibleEndSlot = hourToSlot(visibleEndHour) - 1;
  const visibleSlots = TIME_SLOTS.slice(visibleStartSlot, visibleEndSlot + 1);

  return (
    <div
      className="select-none"
      style={{
        display: 'grid',
        gridTemplateRows: `repeat(${visibleSlots.length}, ${slotHeightPx}px)`,
      }}
    >
      {visibleSlots.map((slot) => (
        <div
          key={slot.index}
          className="relative border-t border-gray-100 pr-2 text-right dark:border-gray-800"
        >
          {slot.minute === 0 && (
            <span className="absolute -top-2 right-2 text-[11px] font-medium text-gray-400 dark:text-gray-500">
              {formatTimeLabel(slot.hour, slot.minute, hourFormat)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
