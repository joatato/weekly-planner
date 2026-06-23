import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCurrentWeekBlocks } from '../../store/selectors';
import { useScheduleStore } from '../../store/useScheduleStore';
import {
  TIME_SLOTS,
  DAY_NAMES_SHORT,
  hourToSlot,
} from '../../lib/constants';
import {
  getWeekDates,
  getWeekRangeLabel,
  getWeekNumber,
  formatTimeLabel,
} from '../../lib/dateUtils';
import { darkenColor } from '../../lib/blockUtils';

/**
 * Layout optimizado para impresión A4 (apaisado). Oculto en pantalla,
 * visible sólo en @media print (clase .print-only en index.css).
 * La grilla usa filas 1fr para llenar exactamente el alto útil de la página.
 */
export function PrintableWeek() {
  const currentWeekKey = useScheduleStore((s) => s.currentWeekKey);
  const blocks = useCurrentWeekBlocks();
  const {
    visibleStartHour,
    visibleEndHour,
    showWeekends,
    hourFormat,
    printCellBorderWidth,
    printTimeFontSize,
    printBlockFontSize,
    printLineColor,
  } = useScheduleStore((s) => s.settings);

  const dates = getWeekDates(currentWeekKey);
  const dayCount = showWeekends ? 7 : 5;

  const visibleStartSlot = hourToSlot(visibleStartHour);
  const visibleEndSlot = hourToSlot(visibleEndHour) - 1;
  const visibleSlots = TIME_SLOTS.slice(visibleStartSlot, visibleEndSlot + 1);

  // Líneas de hora en punto: color pleno. Líneas de media hora: tenue (alpha).
  const lineMajor = `${printCellBorderWidth}px solid ${printLineColor}`;
  const lineMinor = `${printCellBorderWidth}px solid ${printLineColor}66`;

  return (
    <div className="print-only px-2">
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="text-lg font-bold text-gray-900">
          Semana {getWeekNumber(currentWeekKey)}
        </h1>
        <span className="text-sm text-gray-500">{getWeekRangeLabel(currentWeekKey)}</span>
      </div>

      <div
        className="print-grid w-full"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `38px repeat(${dayCount}, 1fr)`,
          gridTemplateRows: 'auto minmax(0, 1fr)',
          border: lineMajor,
        }}
      >
        {/* Cabecera */}
        <div className="print-header bg-gray-100" style={{ borderBottom: lineMajor }} />
        {dates.slice(0, dayCount).map((date, day) => (
          <div
            key={day}
            className="print-header bg-gray-100 py-1 text-center"
            style={{ borderBottom: lineMajor, borderLeft: lineMajor }}
          >
            <div className="font-semibold uppercase text-gray-500" style={{ fontSize: printTimeFontSize }}>
              {DAY_NAMES_SHORT[day]}
            </div>
            <div className="font-bold text-gray-800" style={{ fontSize: printTimeFontSize + 2 }}>
              {format(date, 'd', { locale: es })}
            </div>
          </div>
        ))}

        {/* Columna de horas */}
        <div
          style={{
            display: 'grid',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            gridTemplateRows: `repeat(${visibleSlots.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleSlots.map((slot) => (
            <div
              key={slot.index}
              className="relative pr-1 text-right"
              style={{ borderTop: slot.minute === 0 ? lineMajor : lineMinor }}
            >
              {slot.minute === 0 && (
                <span
                  className="absolute inset-0 flex items-center justify-end pr-1 text-gray-400"
                  style={{ fontSize: printTimeFontSize }}
                >
                  {formatTimeLabel(slot.hour, slot.minute, hourFormat)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Columnas de días */}
        {Array.from({ length: dayCount }, (_, day) => {
          const dayBlocks = blocks.filter((b) => b.dayIndex === day);
          const visibleBlocks = dayBlocks.filter(
            (b) => b.startSlot <= visibleEndSlot && b.startSlot + b.duration > visibleStartSlot,
          );
          return (
            <div
              key={day}
              className="relative"
              style={{
                display: 'grid',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
                gridTemplateRows: `repeat(${visibleSlots.length}, minmax(0, 1fr))`,
                borderLeft: lineMajor,
              }}
            >
              {visibleSlots.map((slot, i) => (
                <div
                  key={slot.index}
                  className="print-cell"
                  style={{
                    gridRow: `${i + 1} / span 1`,
                    gridColumn: 1,
                    borderTop: slot.minute === 0 ? lineMajor : lineMinor,
                  }}
                />
              ))}
              {visibleBlocks.map((block) => {
                const displayStart = Math.max(block.startSlot, visibleStartSlot);
                const displayEnd = Math.min(block.startSlot + block.duration, visibleEndSlot + 1);
                const displayDuration = displayEnd - displayStart;
                const gridRowStart = displayStart - visibleStartSlot + 1;
                return (
                  <div
                    key={block.id}
                    className="print-block m-px overflow-hidden rounded-sm border px-1"
                    style={{
                      gridRow: `${gridRowStart} / span ${displayDuration}`,
                      gridColumn: 1,
                      backgroundColor: block.type.color,
                      color: block.type.textColor,
                      borderColor: darkenColor(block.type.color, 0.2),
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: printBlockFontSize }} className="truncate font-semibold leading-none">
                      {block.type.name}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
