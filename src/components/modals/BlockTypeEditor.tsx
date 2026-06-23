import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { COLOR_PALETTE } from '../../lib/constants';
import { getContrastTextColor, darkenColor } from '../../lib/blockUtils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ColorPicker } from '../ui/ColorPicker';

export function BlockTypeEditor() {
  const activeModal = useScheduleStore((s) => s.activeModal);
  const modalContext = useScheduleStore((s) => s.modalContext);
  const closeModal = useScheduleStore((s) => s.closeModal);
  const addBlockType = useScheduleStore((s) => s.addBlockType);
  const updateBlockType = useScheduleStore((s) => s.updateBlockType);
  const deleteBlockType = useScheduleStore((s) => s.deleteBlockType);
  const existingType = useScheduleStore((s) =>
    modalContext?.typeId ? s.blockTypes[modalContext.typeId] : undefined,
  );

  const isEdit = activeModal === 'editType';

  const [name, setName] = useState(existingType?.name ?? '');
  const [color, setColor] = useState(existingType?.color ?? COLOR_PALETTE[0]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const textColor = getContrastTextColor(color);
    if (isEdit && existingType) {
      updateBlockType(existingType.id, { name: trimmed, color, textColor });
    } else {
      addBlockType({ name: trimmed, color, textColor });
    }
    closeModal();
  };

  const handleDelete = () => {
    if (existingType) deleteBlockType(existingType.id);
    closeModal();
  };

  const textColor = getContrastTextColor(color);

  return (
    <Modal
      title={isEdit ? 'Editar tipo' : 'Nuevo tipo de bloque'}
      onClose={closeModal}
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
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!name.trim()}>
            {isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {isEdit && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
            Los cambios se aplican a <strong>todos los bloques</strong> de este tipo, en
            todas las semanas.
          </p>
        )}

        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Trabajo, Estudio…"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
        />

        <ColorPicker value={color} onChange={setColor} />

        {/* Vista previa */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Vista previa</span>
          <div
            className="flex h-12 items-center rounded-md border px-3 text-sm font-semibold shadow-sm"
            style={{
              backgroundColor: color,
              color: textColor,
              borderColor: darkenColor(color, 0.18),
            }}
          >
            {name.trim() || 'Nombre del bloque'}
          </div>
        </div>
      </div>
    </Modal>
  );
}
