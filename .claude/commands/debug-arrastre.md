# /debug-arrastre — Diagnosticar problemas de drag & drop

Usá este skill cuando el arrastre no funcione, el overlay no aparezca, los bloques no se suelten donde corresponde, o haya comportamientos raros durante el drag.

---

## Arquitectura del sistema de drag

```
AppShell
  └── DndContext (sensors, collisionDetection, handlers)
        ├── BlockTypeSidebar
        │     └── BlockTypeChip  ←  useDraggable  (data.type = 'block-type')
        └── WeekGrid
              └── DayColumn
                    ├── EmptySlot      ←  useDroppable  (data: { dayIndex, slotIndex })
                    └── ScheduleBlock  ←  useDraggable  (data.type = 'block')
```

**Hook central:** `src/hooks/useDragDrop.ts`  
**Overlays:** `BlockDragOverlay` y `BlockTypeDragOverlay` — renderizados en `AppShell`

---

## Checklist diagnóstico

### El drag no arranca

- [ ] El componente draggable tiene `{...listeners}` y `{...attributes}` aplicados al elemento DOM
- [ ] El sensor `PointerSensor` tiene `activationConstraint: { distance: 5 }` — hay que mover 5px para activar. Si el problema es que "a veces no agarra", esto es normal en clicks cortos
- [ ] El elemento tiene `touch-none` en Tailwind (evita que el browser maneje el touch primero)
- [ ] El `DndContext` en `AppShell` envuelve tanto la sidebar como la grilla

### El overlay no aparece

- [ ] En `useDragDrop`, verificar que `handleDragStart` setea `activeDrag` correctamente según `event.active.data.current.type`
- [ ] En `AppShell`, verificar que `activeBlock` o `activeBlockType` tienen valor durante el drag
- [ ] El `DragOverlay` debe estar dentro del `DndContext` (está al final de `AppShell`, correcto)
- [ ] `dropAnimation={null}` está seteado — sin esto el overlay hace una animación de "vuelta" al soltar

### El bloque no se crea / mueve al soltar

- [ ] Verificar que `over` no es `null` en `handleDragEnd` (si es null, se soltó fuera de un droppable)
- [ ] Verificar que `over.data.current` tiene `{ dayIndex, slotIndex }` — ese es el contrato de `EmptySlot`
- [ ] Verificar que `active.data.current.type` es `'block'` o `'block-type'` exactamente (typos)
- [ ] Para drops de tipo → `addBlock`: confirmar que `currentWeekKey` tiene valor en el store

### El bloque cae en el slot equivocado (offset visual)

El collision detection usa el **borde superior** del overlay (`topEdgeClosestCenter` en `src/lib/collisionDetection.ts`), no el centro. Si el bloque cae un slot más abajo de lo esperado, el problema suele ser la altura del slot (`slotHeightPx`) o un bug en el layout del grid.

- [ ] Verificar que `slotHeightPx` coincide entre `DayColumn` (grid-template-rows) y `ScheduleBlock` (height en px)
- [ ] Verificar que `visibleStartSlot` es correcto en `DayColumn` — los índices de `EmptySlot` son absolutos (0-33), no relativos a la vista

### La animación de entrada no se ve

- [ ] `justDroppedBlockId` se propaga: `AppShell` → `WeekGrid` → `DayColumn` → `ScheduleBlock` (prop `animateIn`)
- [ ] `src/index.css` tiene el keyframe `block-pop-in` y la clase `animate-block-pop-in`
- [ ] El `setTimeout` de 400ms en `useDragDrop` limpia `justDroppedBlockId` — si la animación parpadea dos veces, el id se está seteando más de una vez

---

## Herramientas de diagnóstico

Agregar temporalmente en `handleDragStart`/`handleDragEnd` para ver qué llega:

```ts
console.log('[drag start]', event.active.data.current);
console.log('[drag end] over:', event.over?.id, event.over?.data.current);
```

Para ver todos los droppables registrados, podés usar `useDndContext()` en cualquier componente dentro del `DndContext`:

```tsx
import { useDndContext } from '@dnd-kit/core';
const { droppableContainers } = useDndContext();
console.log([...droppableContainers.values()].map(d => d.id));
```
