# Weekly Planner — Guía de codebase para Claude

## Qué es esto

Planificador semanal de bloques de tiempo. El usuario crea **tipos de bloque** (categorías con color) e instancia bloques en la grilla horaria de la semana actual. Todo se persiste en `localStorage`.

---

## Stack

| Capa | Librería |
|---|---|
| UI | React 19 + TypeScript + TailwindCSS v4 |
| Build | Vite 8 |
| Estado | Zustand v5 (immer + temporal/zundo para undo/redo) |
| Drag & Drop | @dnd-kit/core v6 + @dnd-kit/modifiers |
| Fechas | date-fns v4 (locale `es`) |
| IDs | nanoid |

---

## Arquitectura en capas

```
AppShell                  ← DndContext vive aquí (envuelve sidebar + grilla)
  ├── Header              ← Navegación de semanas, perfil, ajustes, tema
  ├── BlockTypeSidebar    ← Chips draggables de tipos de bloque
  │     └── BlockTypeChip ← useDraggable (data: { type:'block-type', blockTypeId })
  ├── WeekGrid            ← CSS Grid; recibe justDroppedBlockId
  │     ├── DayHeader     ← Nombre del día + número de fecha
  │     ├── DayColumn     ← Grid de slots; pasa animateIn a ScheduleBlock
  │     │     ├── EmptySlot      ← useDroppable; crea bloque o abre modal al clic
  │     │     └── ScheduleBlock  ← useDraggable (data: { type:'block', blockId })
  │     └── TimeColumn    ← Etiquetas horarias izquierda
  └── ModalManager        ← Portales de modales (createBlock, editBlock, editType, createType)
```

---

## Estado global (`useScheduleStore`)

**Archivo:** `src/store/useScheduleStore.ts`

Zustand con tres middlewares apilados: `persist → temporal(zundo) → immer`.

### Datos persistidos

```ts
blockTypes: Record<string, BlockType>   // tipos indexados por id
blocks:     Record<string, ScheduleBlock> // todos los bloques de todas las semanas
blockTypeOrder: string[]                // orden visual de la sidebar
darkMode: boolean
settings: AppSettings
```

### Estado efímero (no persistido)

```ts
currentWeekKey: string   // "2026-W23"
selectedBlockId: string | null
activeModal: ModalKind | null
modalContext: ModalContext | null
```

### Acciones clave

| Acción | Qué hace |
|---|---|
| `addBlock(block)` | Crea un bloque, retorna su nuevo id |
| `moveBlock(id, dayIndex, startSlot)` | Mueve un bloque existente |
| `addBlockType(type)` | Crea un tipo, lo agrega al orden |
| `openModal(kind, context?)` | Abre un modal con contexto opcional |
| `updateSetting(key, value)` | Actualiza un ajuste individual |

### Undo/redo

Zundo trackea sólo `{ blocks, blockTypes, blockTypeOrder }`. El throttle de 400 ms hace que un gesto drag completo cuente como un solo paso de deshacer.

---

## Tipos principales (`src/types/index.ts`)

```ts
BlockType       id, name, color (hex), textColor
ScheduleBlock   id, typeId, weekKey, dayIndex, startSlot, duration, note?, recurringId?
ResolvedBlock   ScheduleBlock + type: BlockType  ← sólo para render
TimeSlot        index, label, hour, minute
AppSettings     visibleStartHour/EndHour, slotHeightPx, showWeekends, hourFormat, sound, print*
ModalKind       'createBlock' | 'editBlock' | 'editType' | 'createType'
```

---

## Grilla de tiempo

- **Cobertura:** 06:00 → 23:00  
- **Slots:** 34 (30 min c/u) → `TIME_SLOTS` en `src/lib/constants.ts`  
- **Slot 0** = 06:00; **slot 33** = 22:30 (el bloque termina a las 23:00)  
- Conversión: `hourToSlot(hour)` = `(hour - 6) * 2`  
- `clampBlock(startSlot, duration)` en `src/lib/blockUtils.ts` evita que un bloque se salga de la grilla

---

## Drag & Drop

**Hook central:** `src/hooks/useDragDrop.ts`

Dos tipos de arrastre discriminados por `active.data.current.type`:

| `type` | Origen | Efecto |
|---|---|---|
| `'block'` | `ScheduleBlock` | `moveBlock(id, dayIndex, slotIndex)` |
| `'block-type'` | `BlockTypeChip` | `addBlock({typeId, dayIndex, slotIndex, duration:2})` |

**Collision detection:** `topEdgeClosestCenter` en `src/lib/collisionDetection.ts`  
Usa el **borde superior** del overlay (no el centro) para que la marca de destino coincida con la arista superior del bloque visual.

**Overlays:**
- `BlockDragOverlay` → bloque existente (ancho dinámico = dayWidth)
- `BlockTypeDragOverlay` → chip de tipo (ancho fijo, pill con color)

**Animación de entrada:** cuando se suelta un chip desde la sidebar, el nuevo bloque recibe `animateIn=true` → clase CSS `animate-block-pop-in` → keyframe spring 350ms en `src/index.css`.

---

## Modales

`ModalManager` despacha según `activeModal`:

| `ModalKind` | Componente | Apertura |
|---|---|---|
| `createBlock` | `BlockModal` | Clic en `EmptySlot` |
| `editBlock` | `BlockModal` | Doble clic en `ScheduleBlock` |
| `editType` | `BlockTypeEditor` | Clic en lápiz de `BlockTypeChip` |
| `createType` | `BlockTypeEditor` | Botón `+` en `BlockTypeSidebar` o desde `BlockModal` |

`BlockModal` soporta selección múltiple de días y repetición semanal (5 semanas).

---

## Selectores (`src/store/selectors.ts`)

| Hook | Retorna |
|---|---|
| `useCurrentWeekBlocks()` | `ResolvedBlock[]` de la semana visible |
| `useOrderedBlockTypes()` | `BlockType[]` en el orden del sidebar |

Ambos usan `useMemo` sobre referencias estables para no romper `useSyncExternalStore`.

---

## Utilidades

| Archivo | Funciones destacadas |
|---|---|
| `src/lib/blockUtils.ts` | `clampBlock`, `darkenColor`, `getContrastTextColor` |
| `src/lib/dateUtils.ts` | `getWeekKey`, `getWeekDates`, `navigateWeekKey`, `formatTimeLabel` |
| `src/lib/constants.ts` | `TIME_SLOTS`, `DEFAULT_BLOCK_TYPES`, `DEFAULT_SETTINGS`, `COLOR_PALETTE` |
| `src/lib/collisionDetection.ts` | `topEdgeClosestCenter` |
| `src/lib/cn.ts` | `cn()` (clsx + tailwind-merge) |

---

## Convenciones

- **Componentes:** PascalCase, un archivo por componente.
- **Hooks:** `use` prefix, en `src/hooks/`.
- **Sin prop drilling profundo:** pasar props sólo hasta 2-3 niveles; para más, usar el store.
- **Comentarios:** solo cuando el *por qué* no es obvio. Sin docstrings multilinea.
- **Tailwind:** clases directas en JSX. Usar `cn()` para condicionales.
- **CSS global (`index.css`):** solo para keyframes, scrollbar y print. No agregar clases de componente aquí.
- **`addBlock` retorna el nuevo id** — usarlo si hay que referenciar el bloque inmediatamente (ej. `justDroppedBlockId`).

---

## Comandos de desarrollo

```bash
npm run dev      # servidor de desarrollo (Vite HMR)
npm run build    # build de producción
npx tsc --noEmit # verificación de tipos sin compilar
```

---

## Perfiles

`src/lib/profiles.ts` + `ProfileSwitcher` → múltiples usuarios en el mismo navegador.  
Cada perfil tiene su propia clave de `localStorage`: `weekly-planner-v1-{profileId}`.

---

## Impresión

`PrintableWeek` se renderiza en paralelo al app (oculto en pantalla, visible al imprimir).  
Los ajustes de impresión viven en `AppSettings` (`printCellBorderWidth`, `printTimeFontSize`, etc.).  
Ver `src/components/print/PrintableWeek.tsx` y los estilos en `@media print` en `index.css`.
