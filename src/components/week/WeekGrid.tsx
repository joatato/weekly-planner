import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDndContext } from '@dnd-kit/core';
import { isToday, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useCurrentWeekBlocks } from '../../store/selectors';
import { useScheduleStore } from '../../store/useScheduleStore';
import { getWeekDates } from '../../lib/dateUtils';
import { DAY_NAMES } from '../../lib/constants';
import { useIsMobile } from '../../hooks/useIsMobile';

import { TimeColumn } from './TimeColumn';
import { DayColumn } from './DayColumn';
import { DayHeader } from './DayHeader';

const TIME_COL_WIDTH = 56;
/** Distancia mínima (px) de swipe horizontal para cambiar de día en móvil */
const SWIPE_THRESHOLD = 50;

interface WeekGridProps {
  /** Id del bloque recién creado por drop lateral — dispara su animación de entrada */
  justDroppedBlockId: string | null;
}

export function WeekGrid({ justDroppedBlockId }: WeekGridProps) {
  const currentWeekKey = useScheduleStore((s) => s.currentWeekKey);
  const blocks = useCurrentWeekBlocks();
  const setSelectedBlock = useScheduleStore((s) => s.setSelectedBlock);
  const showWeekends = useScheduleStore((s) => s.settings.showWeekends);
  const isMobile = useIsMobile();

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

  // ---- Navegación de un solo día (móvil) ----
  const todayIndex = dates.findIndex((d) => isToday(d));
  const [mobileDayIndex, setMobileDayIndex] = useState(() =>
    todayIndex >= 0 && todayIndex < dayCount ? todayIndex : 0,
  );
  useEffect(() => {
    // Si cambia la semana o showWeekends achica el rango, mantener el índice dentro de límites
    setMobileDayIndex((i) => Math.min(i, dayCount - 1));
  }, [currentWeekKey, dayCount]);

  // dnd-kit escucha en `document`, pero los eventos táctiles de React siguen
  // burbujeando por este contenedor: sin este guard, arrastrar un bloque en
  // horizontal y soltarlo **además** cambiaba de día. Y como iOS sintetiza un
  // click después del touchend del drop, el bloque recién movido se
  // deseleccionaba solo.
  //
  // No alcanza con mirar `active` en el touchend: para entonces dnd-kit ya
  // puede haber terminado el arrastre y puesto `active` en null. Por eso queda
  // anotado en una ref apenas el arrastre empieza.
  const { active } = useDndContext();
  const huboArrastre = useRef(false);
  useEffect(() => {
    if (active) huboArrastre.current = true;
  }, [active]);

  /**
   * Cambiar de día suelta la selección. Sin esto la barra de acciones queda
   * flotando sobre otro día y "Borrar" se lleva puesto un bloque que no está
   * a la vista. Cambiar de semana ya limpia la selección en el store.
   */
  const cambiarDia = (delta: number) => {
    setMobileDayIndex((i) => Math.min(Math.max(i + delta, 0), dayCount - 1));
    setSelectedBlock(null);
  };

  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    huboArrastre.current = active != null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (huboArrastre.current || active) return;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    cambiarDia(delta < 0 ? 1 : -1); // izquierda → día siguiente, derecha → anterior
  };

  /** Clic en el fondo de la grilla: deselecciona, salvo que venga de un drop. */
  const handleFondoClick = () => {
    if (huboArrastre.current) {
      huboArrastre.current = false;
      return;
    }
    setSelectedBlock(null);
  };

  const blocksByDay = Array.from({ length: dayCount }, (_, day) =>
    blocks.filter((b) => b.dayIndex === day),
  );

  if (isMobile) {
    const mobileDate = visibleDates[mobileDayIndex];
    return (
      <div
        data-bloque="calendar.week-grid"
        className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
        onClick={handleFondoClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navegación de día */}
        <div className="flex items-center justify-between border-b border-gray-200 px-2 py-2 dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              cambiarDia(-1);
            }}
            disabled={mobileDayIndex === 0}
            aria-label="Día anterior"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {DAY_NAMES[mobileDayIndex]}
            </span>
            <span
              className={`text-sm font-semibold ${isToday(mobileDate) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-100'}`}
            >
              {format(mobileDate, "d 'de' MMMM", { locale: es })}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              cambiarDia(1);
            }}
            disabled={mobileDayIndex === dayCount - 1}
            aria-label="Día siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: `${TIME_COL_WIDTH}px minmax(0, 1fr)` }}
        >
          <div className="pt-2">
            <TimeColumn />
          </div>
          <div className="pt-2">
            <DayColumn
              dayIndex={mobileDayIndex}
              blocks={blocksByDay[mobileDayIndex]}
              isToday={isToday(mobileDate)}
              justDroppedBlockId={justDroppedBlockId}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      data-bloque="calendar.week-grid"
      className="min-w-[820px] rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      onClick={handleFondoClick}
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
