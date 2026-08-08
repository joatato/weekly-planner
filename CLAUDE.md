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

## Commits: regla de oro

**En este repo pueden trabajar varios agentes al mismo tiempo, sobre el mismo
working tree. Commiteá SOLO los archivos que tocaste vos.**

Si ves cambios en archivos que no editaste, no son tuyos: son de otro agente que
está trabajando en paralelo, probablemente a mitad de camino. Dejalos donde están.

### Antes de commitear

1. `git status` — mirá todo lo que hay modificado.
2. Identificá cuáles de esos archivos tocaste **vos, en esta sesión**. Si hay
   agentes trabajando, no lo deduzcas: leé `.bitacora/` (abajo).
3. `git add <ruta1> <ruta2>` — nombrá cada archivo explícitamente.
4. `git diff --staged` — confirmá que no se coló nada ajeno.
5. `git commit -m "..."`

### Comandos prohibidos

Un hook los bloquea automáticamente (`.claude/hooks/guard-git-scope.ps1`):

| Bloqueado | Por qué |
|---|---|
| `git add -A`, `git add .`, `git add -u` | Barren el working tree entero |
| `git commit -a`, `git commit -am` | Commitean todo lo modificado |
| `git reset --hard` | Destruye lo sin commitear de todos |
| `git checkout .`, `git restore .` | Revierte el working tree entero |
| `git clean -f` | Borra archivos que otro agente está escribiendo |

Si necesitás revertir algo, hacelo por ruta puntual: `git restore src/eso.tsx`.

`git commit --amend` **sí** está permitido: no toca el working tree. Pero no
amendes un commit que no hiciste vos en esta sesión.

Si el trabajo de otro agente te bloquea: no lo commitees "de paso" para sacarlo
del medio, y no lo revientes. Terminá lo tuyo, commiteá tus archivos, y avisá en
tu respuesta que quedaron cambios ajenos sin commitear.

### Formato del mensaje

En español, presente, sin Conventional Commits ni emojis.

```
Área: qué cambió en una línea

Por qué cambió, en prosa. Qué problema resolvía, qué se probó, qué quedó afuera.
Si el cambio es obvio (una línea, un texto), el cuerpo sobra.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

El "Área" es la pantalla o el componente: `Grilla:`, `Sidebar:`, `Ajustes:`,
`Impresión:`, `Fix:`. Si el cambio es transversal, arrancá con el verbo.

### Push y deploy

`main` deploya solo a GitHub Pages (`.github/workflows/`). **Todo push a `main`
sale a producción.** Antes de pushear: `npm run build`. Si el build falla, no
pushees. Ojo: `tsc -b` compila **todo** el proyecto, así que puede fallar por un
archivo a medio escribir de otro agente. Si el error no es tuyo, no lo "arregles"
tocando su archivo — commiteá lo tuyo y decilo.

---

## La bitácora: quién reclamó qué

`.bitacora/` es un `.md` por agente vivo, donde cada uno declara **qué archivos
son suyos** antes de tocarlos. Existe por una sola razón: la regla de arriba
—commiteá solo lo tuyo— necesita saber de quién es cada archivo, y sin esto se
adivina leyendo diffs ajenos. Está gitignoreada: es estado de una sesión, no
historial.

Sirve cuando hay dos o más agentes sobre el mismo working tree. **Con un agente
a la vez es puro costo** — `git status` ya te dice todo.

### El archivo

El nombre lo asigna el hilo principal en el encargo (`.bitacora/impresion.md`),
no un timestamp: los subagentes no tienen identidad propia en runtime, y un
nombre que vos reconocés vale más.

```markdown
---
agente: ejecutar
estado: trabajando          # trabajando | terminado | abandonado
actualizado: 2026-08-06T22:45:00Z
archivos:
  - src/components/print/     # carpeta entera
  - src/index.css             # archivo puntual
---

Impresión: aplicar printCellBorderWidth en el @media print.
```

El header es lo que leen los otros agentes. La línea de abajo es para el humano.

### Cuándo se escribe

| Momento | Qué |
|---|---|
| **Al empezar, antes del primer Edit** | El reclamo. Después del hecho no sirve. |
| **Al terminar** | `estado: terminado` y la lista real de lo que tocó |
| **Solo si el alcance cambió** | Un archivo que no estaba en la lista original |

**No se actualiza por cada edición.** Un diario de progreso lo lee nadie y lo
paga todo el mundo.

### Cuándo se lee

- **Cada agente al arrancar.** Si algo con `estado: trabajando` pisa lo que te
  asignaron, **pará y reportalo** en vez de editar. Si la carpeta no existe o
  está vacía, no hay nadie: seguí.
- **El hilo principal antes de commitear.** La lista `archivos:` es exactamente
  lo que va en el `git add` por ruta.

### Limpieza

El hilo principal borra el archivo del agente cuando commitea lo suyo. Un
`estado: trabajando` con `actualizado` de hace horas es un agente que murió:
ignoralo, no lo respetes como reclamo vivo.

**En worktrees no aplica.** Cada worktree tiene su propia `.bitacora/` y no se
ven entre sí — pero ahí los agentes ya están aislados por construcción, que es
el punto de usar worktrees.

---

## Trabajo en paralelo: worktrees

Para tareas grandes e independientes que van a correr al mismo tiempo, no
compartas el working tree. Cada agente en su propio worktree y su propia rama:

```bash
git worktree add .claude/worktrees/impresion -b feat/impresion
cp .env .claude/worktrees/impresion/.env     # .env está gitignoreado
```

`node_modules` se comparte por symlink automáticamente (configurado en
`.claude/settings.json`), así que no hace falta `npm install`.

Ahí adentro el agente puede commitear tranquilo: está solo. Después se mergea a
`main`, que es lo que deploya.

```bash
git worktree remove .claude/worktrees/impresion
git branch -d feat/impresion
```

Regla práctica: si dos tareas tocan **archivos distintos**, el working tree
compartido alcanza. Si tocan **los mismos archivos**, usá worktrees o corré las
tareas de a una.

---

## Delegar a otro agente

**Un subagente no ahorra crédito: ahorra contexto del hilo principal.** Arranca
en frío y tiene un piso de ~45k tokens aunque la tarea sea de tres líneas. Medido
en una sesión real: 8 subagentes, 478k tokens; uno de ellos gastó 65k escribiendo
tres archivos markdown que el hilo principal hacía con 5k.

Así que **se delega cuando hay algo que ganar, no por defecto**:

| Delegá | Hacelo vos |
|---|---|
| Varios archivos **disjuntos** en paralelo | 1-3 archivos, aunque sean varios cambios |
| Tarea larga y mecánica sobre carpetas separadas | Cualquier cosa que un grep o un Edit resuelvan |
| Una búsqueda amplia (`Explore`) | Diseñar, integrar y commitear: eso no se delega nunca |

Si la sesión se está por quedar sin contexto, la ecuación se da vuelta y conviene
delegar más. Cuando eso pase, **proponé compactar** en vez de delegar de más.

Viven en `.claude/agents/`. Se cargan **al iniciar la sesión**: uno recién
escrito no está disponible en la sesión que lo escribió.

| Agente | Para qué | Modelo |
|---|---|---|
| `ejecutar` | Aplicar un cambio ya diseñado, 1-3 archivos | sonnet |
| `revisar` | Correr el build y leer el diff antes de commitear | haiku |
| `probar` | Abrir la app en el navegador y mirar si anda | haiku |

Para buscar código, `Explore` ya viene de fábrica. No hace falta uno propio.

**haiku para lo mecánico y observacional, sonnet para lo que escribe código,
opus nunca en un subagente.** El modelo se puede forzar por invocación: si el
encargo es copiar, mover o renombrar archivos, mandalo en haiku aunque el agente
declare sonnet.

`probar` es el que más gasta con diferencia —84k en una sola corrida— porque los
snapshots del navegador son enormes. **Usalo solo para lo que hay que *ver*.**
Todo lo que se mide (¿se creó el bloque? ¿cambió de día? ¿desborda el header?) sale
más barato con `browser_evaluate` devolviendo un JSON chico desde el hilo
principal.

Cinco reglas:

1. **No delegues lo que un grep resuelve.** El subagente arranca en frío; para un
   arreglo de una línea, armar el brief cuesta más que hacerlo.
2. **Cortá por archivo, no por tarea.** Tres pedidos sobre el mismo archivo son un
   agente, no tres.
3. **No reanudes un agente para un chequeo chico** — reanudar reproduce todo su
   transcript y sale más caro que uno nuevo con brief angosto.
4. **Prohibiles el build** a los que corren en paralelo, o van a perseguir el
   error del archivo a medio guardar del otro.
5. **Que no commiteen.** El commit lo hace el hilo principal, que es el único que
   sabe qué archivo es de quién.
6. **Pediles la respuesta corta, en el brief.** Un agente que devuelve el diff
   pegado o un informe de treinta líneas te cobra dos veces: una al generarlo y
   otra al leerlo. Ocho líneas alcanzan para qué tocó, si compiló y qué quedó
   afuera.

### El brief

Un agente sin brief corre su checklist genérico y aplica el cambio literal. Lo
que lo hace rendir está en el encargo, y son cinco cosas:

1. **De dónde parte** — qué existe ya, qué no, qué está a medio hacer.
2. **Qué hacer**, concreto. Archivo y línea si los sabés.
3. **El modo de fallo que vos ya viste venir.** Esto es lo que más rinde: el
   estado que no se resetea, el valor que puede venir `undefined`, lo que anda la
   primera vez y no la segunda. Si lo viste y no lo escribís, no lo va a ver.
4. **El alcance** — qué archivos son suyos, nombrados, y cuál es de otro agente.
5. **Su bitácora** — el nombre del archivo, `.bitacora/<nombre>.md`. Solo si hay
   otro agente corriendo en paralelo; con uno solo, sobra.

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

---

## Modo editor

Se prende con `Ctrl+Shift+E`. Con el modo activo, Alt+Click sobre cualquier elemento de la app abre un panel para anotar qué cambiar de ese bloque. En táctil no hay pulsación larga —el `TouchSensor` de dnd-kit arranca a los 200 ms y el gesto nunca llegaría a completarse— así que hay un botón "Anotar" que arma una selección de un solo uso: el próximo toque elige el elemento en vez de hacer lo que haría normalmente.

| Archivo | Qué hace |
|---|---|
| `src/components/editor/ModoEditor.tsx` | La vista: resalta, selecciona, arma el panel |
| `src/lib/bloques.ts` | Traduce un elemento del DOM a `{ bloque, etiqueta, texto }` |
| `src/lib/notas.ts` | Arma el Markdown de la nota y la entrega (disco en dev, descarga o portapapeles fuera) |
| `src/lib/captura.ts` | Captura de pantalla opcional vía `getDisplayMedia` |
| `src/lib/registroPasos.ts` | Últimos clicks y cambios de vista — el "cómo llegué" de la nota |
| `src/store/useEditorStore.ts` | Store aparte a propósito: si `activo` viviera en `useScheduleStore`, prender/apagar el modo entraría al historial de undo de zundo |
| `vite/plugin-notas.ts` | Escribe el `.md` (y el `.png` si hay captura) en `.notas/`, solo en `npm run dev` |

**`data-bloque`:** convención `vista.cosa` en kebab-case (`calendar.week-grid`, `settings.print`), sembrada **una sola vez sobre el template** en las listas, no por cada item. `docs/MAPA-UI.md` es el catálogo de bloque → archivo:línea y se regenera con `npm run mapa`. También se regenera solo: un hook `PostToolUse` (`.claude/hooks/mapa-si-tsx.mjs`) lo rehace cada vez que se edita un `.tsx` que declara un bloque, así que el catálogo no se desactualiza aunque nadie se acuerde de correr el script.

**La regla que no se puede romper:** el `pointermove` del modo editor va con `{ passive: true }` y nunca llama `preventDefault`. `BlockResizeHandle` maneja su propio arrastre con listeners de `pointermove`/`pointerup` en `window`, fuera de dnd-kit; un `preventDefault` acá le rompe el cálculo del resize.

`/notas` lee lo acumulado en `.notas/` y arma un plan de trabajo agrupado por bloque.
