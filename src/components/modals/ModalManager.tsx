import { useScheduleStore } from '../../store/useScheduleStore';
import { BlockModal } from './BlockModal';
import { BlockTypeEditor } from './BlockTypeEditor';

/**
 * Renderiza el modal activo. La `key` fuerza el remontaje al cambiar de
 * contexto, reiniciando el estado interno del formulario.
 */
export function ModalManager() {
  const activeModal = useScheduleStore((s) => s.activeModal);
  const modalContext = useScheduleStore((s) => s.modalContext);

  if (!activeModal) return null;

  const key = `${activeModal}-${modalContext?.blockId ?? ''}-${modalContext?.typeId ?? ''}-${modalContext?.dayIndex ?? ''}-${modalContext?.startSlot ?? ''}`;

  if (activeModal === 'createBlock' || activeModal === 'editBlock') {
    return <BlockModal key={key} />;
  }

  if (activeModal === 'createType' || activeModal === 'editType') {
    return <BlockTypeEditor key={key} />;
  }

  return null;
}
