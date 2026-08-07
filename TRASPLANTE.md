# Trasplante a weekly-planner

Dos piezas independientes:

- **Agentes** — config de Claude Code para trabajar en paralelo sin pisarse. No toca
  código de la app.
- **Modo editor** — Alt+Click sobre la interfaz genera una nota markdown que un
  agente después lee y aplica.

Arrancá por los agentes: se aplica en una tarde y no toca la app.

---

# Pieza A — Agentes

## Copiar

| Archivo | Cambios |
|---|---|
| `.claude/settings.json` | Ninguno |
| `.claude/hooks/guard-git-scope.ps1` | Ninguno |
| `.claude/agents/{ejecutar,revisar,probar}.md` | Reescribir el cuerpo (ver abajo) |
| `.mcp.json` | Ninguno |

Al `CLAUDE.md` que ya existe agregale tres secciones después de "Convenciones":
commits (commiteá solo tus archivos), worktrees, y cómo delegar.

Ojo: existe `.claude/settings.local.json` (permisos personales, no se versiona) y
**no** existe `.claude/settings.json`. Son archivos distintos y conviven.

## El hook no es opcional

`settings.json` preaprueba `Bash(*)`: cualquier comando sin preguntar. El hook es la
única barrera que queda contra un `git add -A` que barra el working tree de otro
agente y lo mande a GitHub Pages. **Van juntos o no va ninguno.**

Bloquea `git add -A/-u/.`, `git commit -a/-am`, `git reset --hard`, `git checkout .`,
`git restore .`, `git clean -f`. Deja pasar `--amend`.

No le toques el pre-procesado que vacía el texto citado antes de analizar: sin eso, un
mensaje de commit que diga "no uses git add -A" se bloquea a sí mismo.

## Los tres agentes

| Agente | Para qué | Modelo |
|---|---|---|
| `ejecutar` | Aplicar un cambio ya diseñado, 1-3 archivos | **sonnet** |
| `revisar` | Correr el build y leer el diff antes de commitear | **haiku** |
| `probar` | Abrir la app en el navegador y mirar si anda | **haiku** |

Regla: **haiku para lo mecánico y observacional, sonnet para lo que escribe código,
opus nunca en un subagente.** `probar` es el que más gasta con diferencia (los
snapshots del navegador son enormes) y el que menos criterio necesita: lo que lo hace
rendir es el brief, no el modelo.

Herramientas: `ejecutar` lleva Read, Edit, Write, Grep, Glob, Bash. `revisar` y
`probar` van sin Edit ni Write. `probar` suma las 16 del MCP de navegador, que van con
el prefijo `mcp__navegador__` — si el server se llama distinto en `.mcp.json`, hay que
reescribir los 16 nombres.

## Gotchas que van en el cuerpo de los agentes

- `useScheduleStore` usa `persist(temporal(immer(...)))`. Hay **dos `partialize`
  distintos**, uno para el undo y otro para localStorage, y no listan lo mismo.
  Agregar un campo al estado lo mete en el equivocado sin querer.
- **Nunca `getState()` dentro del render.** En handlers sí.
- Tailwind v4 no tiene archivo de config: una clase armada en runtime no existe salvo
  que se declare en el CSS.
- La clave de localStorage lleva el perfil activo (`weekly-planner-v1-{profileId}`).
  Cambiar la forma del estado persistido rompe los datos de todos los perfiles.
- `npm run build` corre `tsc -b`, incremental. Un error fantasma puede ser caché de
  `tsconfig.tsbuildinfo`.
- Para `probar`: dev server en `localhost:5173`. No hay rutas — la app conmuta entre
  `calendar` y `settings` con `currentView`.

## Delegación

1. **No delegues lo que un grep resuelve.** El subagente arranca en frío; para un
   arreglo de una línea, armar el brief cuesta más que hacerlo.
2. **Cortá por archivo, no por tarea.** Tres pedidos sobre el mismo archivo son un
   agente, no tres.
3. **No reanudes un agente para un chequeo chico** — reanudar reproduce todo su
   transcript y sale más caro que uno nuevo con brief angosto.
4. **Prohibiles el build** a los que corren en paralelo, o van a perseguir el error
   del archivo a medio guardar del otro.
5. **Que no commiteen.** El commit lo hace el hilo principal, que es el único que sabe
   qué archivo es de quién.

## El brief

1. **De dónde parte** — qué existe, qué no, qué está a medio hacer.
2. **Qué hacer**, con archivo y línea si los sabés.
3. **El modo de fallo que ya viste venir** — el estado que no se resetea, el valor que
   puede venir `undefined`. Si lo viste y no lo escribís, no lo va a ver. Esto es lo
   que más rinde de los cuatro.
4. **El alcance** — qué archivos son suyos, nombrados, y cuál es de otro agente.

## Verificar

1. Pedile a un agente que corra `git add -A`. Tiene que negarlo con una razón.
2. Pedile `git commit -m "prueba: no uses git add -A"`. Tiene que **pasar**.
3. Dos agentes en paralelo sobre archivos distintos: ninguno commitea ni compila.

---

# Pieza B — Modo editor

Con el modo prendido, Alt+Click sobre cualquier parte de la interfaz abre un panel
para escribir. Al guardar aparece un `.md` en `.notas/` con el bloque, la vista, el
elemento, la traza de cómo llegó ahí y una captura. El agente que lo lee no adivina.

## Decisiones que impone este stack

**React 19: no hay `archivo:línea` automático.** El truco que lo sacaba se apoyaba en
`_debugSource`, que React 19 eliminó. El sistema anda igual — pierde dos líneas del
markdown, y el nombre del bloque alcanza para ubicar el código. Si más adelante lo
querés, va un plugin de build que inyecte `data-src="archivo:linea"` en el JSX.

**Tailwind v4: salteá la vista previa de cambios en vivo.** Necesita safelist, que en
v4 se declara con `@source inline(...)` en el CSS. Es una función opcional; sin ella
no necesitás safelist ninguno.

**Estado: un store de zustand nuevo y separado.** No lo metas en `useScheduleStore`:
está envuelto en `temporal` y `persist`, así que prender el modo editor entraría en el
historial de undo y se guardaría como si fuera dato del usuario.

```ts
// src/store/useEditorStore.ts
export const useEditorStore = create<EditorStore>()(
  persist(
    immer((set) => ({ activo: false, cola: [], /* acciones */ })),
    { name: 'weekly-planner-editor', storage: createJSONStorage(() => localStorage) },
  ),
);
```

**La ruta de la nota sale de `useScheduleStore((s) => s.currentView)`**: `calendar` o
`settings`. La sub-sección de Settings vive en `useState` local de `SettingsPage`; si
la querés en la nota hay que subirla al store. Para la primera versión no hace falta.

**Colores del overlay:** acento `indigo-500/600`, superficies `gray-50…950`. El dark
mode es por clase `.dark` en `<html>`, así que todo lleva su variante `dark:`
(`bg-white dark:bg-gray-900`, `border-gray-200 dark:border-gray-700`).

## El conflicto con @dnd-kit

Lo más importante de todo el documento.

**El `pointermove` del editor va `{ passive: true }` y no llama `preventDefault`
nunca.** `BlockResizeHandle` maneja su propio drag con listeners de `pointermove` y
`pointerup` en `window`, fuera de dnd-kit. Un `preventDefault` del editor le rompe el
cálculo del resize.

**No portes la pulsación larga para anotar en celular.** El `TouchSensor` de dnd-kit
arranca a los 200 ms; el gesto de anotar es de 600. A los 200 el bloque ya se está
arrastrando y el gesto nunca se completa. Usá un botón "anotar esto" que aparezca con
el modo prendido, o desmontá el `DndContext` mientras el modo está activo.

En desktop no hay problema: el `MouseSensor` pide 5px de movimiento y un Alt+Click
quieto no lo dispara.

**Tres menús escuchan `mousedown` en `document`** (`Header`, `AccountMenu`,
`ProfileSwitcher`) para cerrarse al clickear afuera. Un Alt+Click los va a cerrar de
paso. Es cosmético; si molesta, `stopImmediatePropagation()` en el handler del editor,
que corre en captura y llega antes.

## Los archivos

| Archivo | Qué hacer |
|---|---|
| `lib/captura.ts` | Copiar tal cual (cero imports) |
| `lib/registroPasos.ts` | Copiar tal cual (DOM puro) |
| `lib/notas.ts` | Copiar; `import.meta.env.DEV` funciona igual en Vite 8 |
| `vite/plugin-notas.ts` | Copiar; la API de plugin de Vite 8 es la misma |
| `scripts/mapa-ui.mjs` | Copiar tal cual (Node puro) |
| `lib/bloques.ts` | Solo la mitad genérica, ~35 líneas |
| `lib/colaNotas.ts` | Quedarse con la lógica de la cola, tirar el store |
| `lib/{modoEditor,preferencias}.ts` | Tirar — los reemplaza zustand |
| `lib/ajustes.ts` | Saltear en la primera pasada |
| `lib/puenteNotas.ts` | Opcional, contra Firebase |
| `components/ModoEditor.tsx` | Reescribir: es vista |

## Orden

Cada paso deja algo que sirve. No sigas al siguiente hasta que el anterior ande.

1. **La nota al disco.** Plugin de Vite + `notas.ts`. Probalo con un `fetch` a mano
   desde la consola: si aparece el `.md` en `.notas/`, la mitad difícil ya está.
2. **La identidad del bloque.** La mitad genérica de `bloques.ts` y los primeros
   `data-bloque` sobre la grilla y la sidebar.
3. **El overlay mínimo.** Hover que resalta, Alt+Click que selecciona, textarea, botón
   de guardar. Sin cola, sin captura, sin ajustes.
4. **La traza** (`registroPasos.ts` tal cual). Es lo que más sirve para reproducir el
   problema y sale casi gratis.
5. **La captura** (`captura.ts` tal cual).
6. **Opcional**: la cola, el buzón por Firebase, los ajustes en vivo.

## Sembrar `data-bloque`

Solo donde esperás pedidos. Un bloque sin sembrar degrada solo: el recuadro cae sobre
el elemento crudo y el markdown dice "sin nombre".

Convención `vista.cosa` en kebab-case: `calendar.week-grid`, `calendar.sidebar`,
`calendar.header`, `settings.appearance`. Las listas se marcan **una vez sobre el
template** (el componente `ScheduleBlock`), no por ítem.

Los `<div>` aceptan `data-bloque` sin tocar nada. `Button` e `Input` también, porque
spredean props. `Slider`, `Toggle`, `ColorPicker` y `Modal` tienen interfaces cerradas:
si querés marcarlos, agregales la prop a mano.

## Tres trampas

**Montá el overlay a nivel de `App`**, que devuelve un Fragment. Adentro de un `Modal`
no: su `backdrop-blur` crea un containing block y el `position: fixed` del recuadro
deja de funcionar.

**Todos los contenedores del overlay llevan `data-editor-ui`.** Cinco lugares lo
consultan para ignorarse a sí mismos: hover, click, touch, traza y captura. Sin eso el
sistema se detecta a sí mismo.

**Alt+Click hay que interceptarlo desde `mousedown`**: sobre un `<a>`, dispara la
descarga del navegador antes de que llegue el `click`.

## Y una advertencia

La traza de "cómo llegué" arrastra texto de pantalla —nombres de bloques, lo que haya
escrito el usuario— y termina en el `.md`. Si incomoda, filtrala antes de guardar.

## Verificar

1. Alt+Click sobre un elemento con `data-bloque`, escribir, guardar: aparece el `.md`.
2. Alt+Click sobre uno **sin** `data-bloque`: funciona igual y dice "sin nombre".
3. **Con el modo prendido, arrastrar un bloque de la grilla y redimensionarlo.** Los
   dos gestos tienen que seguir funcionando. Este es el que importa acá.
4. Modo oscuro: el overlay sigue legible.
5. `.notas/` está en el `.gitignore`.
