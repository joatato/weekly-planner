import { useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useOrderedBlockTypes } from '../../store/selectors';
import { TIME_SLOTS, DAY_NAMES, DAY_NAMES_SHORT, SLOT_COUNT } from '../../lib/constants';
import { darkenColor } from '../../lib/blockUtils';
import { navigateWeekKey } from '../../lib/dateUtils';
import { cn } from '../../lib/cn';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

/** Opciones de duración en slots → etiqueta legible */
function durationLabel(slots: number): string {
  const mins = slots * 30;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function BlockModal() {
  const activeModal = useScheduleStore((s) => s.activeModal);
  const modalContext = useScheduleStore((s) => s.modalContext);
  const closeModal = useScheduleStore((s) => s.closeModal);
  const addBlocks = useScheduleStore((s) => s.addBlocks);
  const updateBlock = useScheduleStore((s) => s.updateBlock);
  const deleteBlock = useScheduleStore((s) => s.deleteBlock);
  const openModal = useScheduleStore((s) => s.openModal);
  const existingBlock = useScheduleStore((s) =>
    modalContext?.blockId ? s.blocks[modalContext.blockId] : undefined,
  );
  const types = useOrderedBlockTypes();

  const isEdit = activeModal === 'editBlock';

  // Estado inicial del formulario
  const [typeId, setTypeId] = useState<string>(
    existingBlock?.typeId ?? types[0]?.id ?? '',
  );
  const [dayIndices, setDayIndices] = useState<Set<number>>(
    () => new Set([existingBlock?.dayIndex ?? modalContext?.dayIndex ?? 0]),
  );
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [startSlot, setStartSlot] = useState<number>(
    existingBlock?.startSlot ?? modalContext?.startSlot ?? 0,
  );
  const [duration, setDuration] = useState<number>(
    existingBlock?.duration ?? modalContext?.duration ?? 2,
  );
  const [note, setNote] = useState<string>(existingBlock?.note ?? '');

  const maxDuration = SLOT_COUNT - startSlot;
  const durationOptions = useMemo(
    () => Array.from({ length: maxDuration }, (_, i) => i + 1),
    [maxDuration],
  );

  const toggleDay = (i: number) => {
    if (isEdit) {
      setDayIndices(new Set([i]));
      return;
    }
    setDayIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        if (next.size > 1) next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!typeId || dayIndices.size === 0) return;
    const safeDuration = Math.min(duration, SLOT_COUNT - startSlot);

    if (isEdit && existingBlock) {
      updateBlock(existingBlock.id, {
        typeId,
        dayIndex: [...dayIndices][0],
        startSlot,
        duration: safeDuration,
        note: note.trim() || undefined,
      });
    } else {
      const baseWeekKey = useScheduleStore.getState().currentWeekKey;
      const weekKeys: string[] = [baseWeekKey];
      if (repeatWeekly) {
        let wk = baseWeekKey;
        for (let i = 0; i < 4; i++) {
          wk = navigateWeekKey(wk, 'next');
          weekKeys.push(wk);
        }
      }
      const recurringId = repeatWeekly ? nanoid() : undefined;
      const blocksToAdd = weekKeys.flatMap((wk) =>
        [...dayIndices].map((day) => ({
          typeId,
          weekKey: wk,
          dayIndex: day,
          startSlot,
          duration: safeDuration,
          note: note.trim() || undefined,
          recurringId,
        })),
      );
      addBlocks(blocksToAdd);
    }
    closeModal();
  };

  const handleDelete = () => {
    if (existingBlock) deleteBlock(existingBlock.id);
    closeModal();
  };

  return (
    <Modal
      title={isEdit ? 'Editar bloque' : 'Nuevo bloque'}
      onClose={closeModal}
      bloque="calendar.block-modal"
      footer={
        <>
          {isEdit && (
            <Button variant="danger" size="sm" onClick={handleDelete} className="mr-auto">
              <Trash2 size={15} />
              Eliminar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={closeModal}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!typeId}>
            {isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Selector de tipo */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Tipo</span>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeId(t.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-all',
                  typeId === t.id
                    ? 'ring-2 ring-indigo-500 ring-offset-1'
                    : 'opacity-80 hover:opacity-100',
                )}
                style={{
                  backgroundColor: t.color,
                  color: t.textColor,
                  borderColor: darkenColor(t.color, 0.18),
                }}
              >
                {t.name}
              </button>
            ))}
            <button
              onClick={() => openModal('createType')}
              className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300"
            >
              <Plus size={14} />
              Nuevo
            </button>
          </div>
        </div>

        {/* Día */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Día</span>
          <div className="flex flex-wrap gap-1.5">
            {DAY_NAMES.map((name, i) => (
              <label
                key={i}
                title={name}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-all select-none',
                  dayIndices.has(i)
                    ? 'border-indigo-400 bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-gray-800',
                )}
              >
                <input
                  type="checkbox"
                  checked={dayIndices.has(i)}
                  onChange={() => toggleDay(i)}
                  className="accent-indigo-500"
                />
                {DAY_NAMES_SHORT[i]}
              </label>
            ))}
          </div>
        </div>

        {/* Repetir semanalmente (solo al crear) */}
        {!isEdit && (
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={repeatWeekly}
              onChange={(e) => setRepeatWeekly(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              Repetir semanalmente{' '}
              <span className="text-gray-400 dark:text-gray-500">(próximas 4 semanas)</span>
            </span>
          </label>
        )}

        {/* Inicio y duración */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="start-select" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Inicio
            </label>
            <select
              id="start-select"
              value={startSlot}
              onChange={(e) => {
                const v = Number(e.target.value);
                setStartSlot(v);
                if (duration > SLOT_COUNT - v) setDuration(SLOT_COUNT - v);
              }}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot.index} value={slot.index}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dur-select" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Duración
            </label>
            <select
              id="dur-select"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {durationOptions.map((d) => (
                <option key={d} value={d}>
                  {durationLabel(d)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nota */}
        <Input
          label="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Detalle del bloque…"
        />
      </div>
    </Modal>
  );
}
