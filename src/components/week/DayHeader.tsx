import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { DAY_NAMES } from '../../lib/constants';
import { cn } from '../../lib/cn';

interface DayHeaderProps {
  dayIndex: number;
  date: Date;
}

export function DayHeader({ dayIndex, date }: DayHeaderProps) {
  const today = isToday(date);
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-2',
        today && 'bg-indigo-50 dark:bg-indigo-950/50',
      )}
    >
      <span
        className={cn(
          'text-xs font-medium uppercase tracking-wide',
          today ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500',
        )}
      >
        {DAY_NAMES[dayIndex]}
      </span>
      <span
        className={cn(
          'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
          today ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200',
        )}
      >
        {format(date, 'd', { locale: es })}
      </span>
    </div>
  );
}
