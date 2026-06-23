interface CurrentTimeLineProps {
  slot: number;           // índice absoluto
  offsetPct: number;      // 0–1 dentro del slot
  visibleStartSlot: number;
  slotHeightPx: number;
}

/**
 * Línea roja horizontal que indica la hora actual dentro de DayColumn.
 * Se posiciona con top calculado a partir del slot y el offset en minutos.
 */
export function CurrentTimeLine({
  slot,
  offsetPct,
  visibleStartSlot,
  slotHeightPx,
}: CurrentTimeLineProps) {
  const relativeSlot = slot - visibleStartSlot;
  const topPx = relativeSlot * slotHeightPx + offsetPct * slotHeightPx;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-40 flex items-center"
      style={{ top: topPx }}
    >
      {/* Círculo izquierdo */}
      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
      {/* Línea */}
      <div className="h-px flex-1 bg-red-500" />
    </div>
  );
}
