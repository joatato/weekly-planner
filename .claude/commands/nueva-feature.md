# /nueva-feature — Guía para agregar una feature

Cuando el usuario pida agregar una nueva funcionalidad a este proyecto, seguí este proceso en orden. Leé CLAUDE.md antes de empezar.

---

## 1. Entender el alcance

Preguntá (si no está claro):
- ¿Afecta el store (nuevo estado/acción) o es puramente UI?
- ¿Necesita persistencia en localStorage?
- ¿Involucra drag & drop?
- ¿Requiere un modal nuevo?

---

## 2. Si necesita estado nuevo en el store

Archivo: `src/store/useScheduleStore.ts`

- Agregar el campo al interface `ScheduleStore` (y a `PersistedState` si debe persistir)
- Agregar valor inicial
- Agregar la acción con immer: `set((state) => { state.campo = valor })`
- Si debe persistir: agregarlo al `partialize` del `persist` middleware
- Si debe incluirse en undo/redo: agregarlo al `partialize` del `temporal` middleware
- Agregar el tipo en `src/types/index.ts` si es una entidad nueva

## 3. Si necesita un selector nuevo

Archivo: `src/store/selectors.ts`

- Usar `useMemo` sobre selectores de referencias estables (Records, no arrays)
- Nunca derivar arrays dentro del selector de Zustand (causa re-renders infinitos)

## 4. Si necesita UI nueva

- Componentes en `src/components/{categoria}/NombreComponente.tsx`
- Categorías existentes: `blocks/`, `layout/`, `modals/`, `settings/`, `sidebar/`, `ui/`, `week/`, `print/`
- Usar `cn()` para clases condicionales (importar de `src/lib/cn.ts`)
- Tailwind directo en JSX, sin CSS extra salvo keyframes

## 5. Si necesita un modal nuevo

- Crear el componente en `src/components/modals/`
- Agregar el nuevo `ModalKind` al tipo en `src/types/index.ts`
- Registrarlo en `src/components/modals/ModalManager.tsx`
- Abrirlo con `openModal('nuevoKind', { contexto })` desde donde corresponda

## 6. Si involucra drag & drop

- Los draggables usan `useDraggable({ id, data: { type: 'nombre', ...payload } })`
- Los droppables usan `useDroppable({ id: 'slot-{day}-{slot}', data: { dayIndex, slotIndex } })`
- El `DndContext` vive en `AppShell` — no crear contextos anidados
- Agregar el nuevo `type` en el `handleDragEnd` de `src/hooks/useDragDrop.ts`

## 7. Si necesita ajuste de usuario

Usar el skill `/agregar-setting`.

---

## 8. Verificar

Antes de dar la feature por terminada:
1. Correr `/check` (tsc + build sin errores)
2. Confirmar que el store serializa correctamente (abrir DevTools → Application → localStorage)
3. Probar undo/redo si el cambio afecta bloques o tipos

---

## Cosas que NO hacer

- No crear archivos CSS separados por componente (solo Tailwind + `index.css` para keyframes)
- No usar `useEffect` para sincronizar estado derivado (usar selectores con `useMemo`)
- No romper el patrón de `temporal`: no agregar a undo/redo cosas que no son datos (ej. `selectedBlockId`)
- No duplicar lógica de fecha: usar funciones de `src/lib/dateUtils.ts`
- No usar `getState()` dentro de componentes React (solo en handlers de eventos fuera del ciclo de render)
