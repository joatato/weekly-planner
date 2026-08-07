# Plan: móvil, PWA y sincronización

Estado al 2026-08-06. Rama de trabajo: `feat/pwa-movil` (worktree en
`.claude/worktrees/movil`).

---

## Por qué existe este plan

Dos pedidos que resultaron ser el mismo trabajo:

1. **Pantalla completa.** Safari en iPhone **no soporta la Fullscreen API**
   (`Element.requestFullscreen` no existe). El único "pantalla completa" real
   en iPhone es el modo standalone de PWA.
2. **Que funcione en iPhone.** La app tenía piezas móviles (`useIsMobile`,
   `MobileBottomNav`) pero varias funciones centrales eran inalcanzables sin
   mouse ni teclado.

Y un tercer problema que apareció al auditar: **el login con Google no hace
nada.** Autentica y muestra el avatar, nada más. Entrar desde el iPhone con la
misma cuenta muestra un planificador vacío.

---

## Fase 1 — PWA + pantalla completa ✅ HECHA Y DEPLOYADA

Commit `6d6ad42`, mergeado a `main` en `54cca2d`.

- `public/manifest.webmanifest` — `display: standalone`, `start_url` y `scope`
  **relativos** (se resuelven contra la URL del manifest, así andan igual en
  `/weekly-planner/` que en la raíz del dev server).
- `public/apple-touch-icon.png` (180), `icon-192`, `icon-512`,
  `icon-maskable-512` — PNG, porque **iOS no acepta SVG** para apple-touch-icon.
  Generados con la identidad real de la app: indigo `#4f46e5` + `CalendarDays`.
- `index.html` — `lang="es"`, `viewport-fit=cover`, meta tags de Apple,
  `theme-color`.
- `src/hooks/useFullscreen.ts` — `{ isFullscreen, isSupported, toggle }`. Estado
  derivado del listener de `fullscreenchange`, **no** de un `setState` optimista.
- `Header.tsx` — botón en escritorio + ítem en el kebab. **No se renderiza si
  `isSupported` es `false`** (o sea: no aparece en iPhone).
- `h-screen` → `h-dvh` en `AppShell.tsx` y `SettingsPage.tsx`; safe-area en la
  bottom nav y en los `<main>`; inputs a `text-base md:text-sm` (Safari hace
  zoom si el campo mide menos de 16px, y el zoom queda pegado).

**Asimetría de rutas, a propósito:** absolutas en `index.html` (Vite las
reescribe según `base`), relativas dentro del manifest (Vite copia `public/`
tal cual). No "corregir" una para que coincida con la otra.

Verificado en producción: manifest con `application/manifest+json`, los cuatro
íconos en 200, `start_url` resolviendo al subpath, y el toggle sincronizando al
salir de fullscreen por fuera del botón.

---

## Fase 2 — Que iPhone sea usable ⬜ PENDIENTE

Todo esto está diagnosticado y verificado en el código; no hace falta
re-investigar.

### 2.1 Editar y borrar un bloque (lo más grave)

`ScheduleBlock.tsx:92` — `openModal('editBlock')` tiene **un solo caller en todo
el repo**, y está detrás de un `onDoubleClick`. En iPhone la app es de
solo-creación: no se puede editar ni borrar nada.

Agregar long-press. **Modo de fallo:** compite con el `TouchSensor` de dnd-kit,
que tiene `delay: 200` (`AppShell.tsx:69-75`). El long-press tiene que durar más
que eso y cancelarse si el dedo se mueve más que la `tolerance: 8`.

### 2.2 El swipe de día se dispara al soltar un drag

`WeekGrid.tsx:60-73` y `:86-87` — `handleTouchStart`/`handleTouchEnd` con
`SWIPE_THRESHOLD = 50`. dnd-kit escucha en `document`, pero los eventos táctiles
de React siguen burbujeando por ese contenedor: arrastrás un bloque en
horizontal, lo soltás, **y además cambia de día**.

Falta un guard tipo "si hay drag activo, ignorar el swipe". `activeDrag` ni
siquiera llega hoy a `WeekGrid`.

Relacionado: `WeekGrid.tsx:85` tiene `onClick={() => setSelectedBlock(null)}`, y
iOS sintetiza un `click` después del `touchend` del drop — el bloque recién
movido se deselecciona solo.

### 2.3 Tres botones literalmente intocables

Usan `hidden group-hover:*`, que es `display:none` sin mouse:

| Archivo | Acción perdida |
|---|---|
| `ScheduleBlock.tsx:120` | crear bloque encima de otro |
| `ProfileSwitcher.tsx:119` | renombrar perfil |
| `ProfileSwitcher.tsx:127` | eliminar perfil |

Otros dos son `opacity-0 group-hover:opacity-100` — invisibles pero tappables a
ciegas: `BlockResizeHandle.tsx:46` (10px de alto, muy por debajo de los 44px de
target mínimo de iOS) y `BlockTypeChip.tsx:75`.

### 2.4 Copiar, pegar, borrar y selección múltiple: solo teclado

`useCopyPaste.ts:52-70`. `copySelectedBlocks`, `pasteSelectedBlocks` y
`deleteSelectedBlocks` **no los llama ningún componente** — solo el hook de
atajos. Y la selección múltiple se arma con `Shift+click`
(`ScheduleBlock.tsx:86-87`), que no tiene equivalente táctil.

### 2.5 El drawer de tipos tapa la grilla

`BlockTypeSidebar.tsx:107-115` — en móvil es `fixed inset-y-0 left-0 z-50 w-72`.
Arrastrar un chip hasta un slot es imposible: el drawer cubre el destino y nada
lo cierra al empezar el drag. La ayuda "Arrastrá un tipo al semanal para crear"
(`BlockTypeSidebar.tsx:61`) es falsa en iPhone.

### 2.6 iPhone horizontal cae en la vista de escritorio

`useIsMobile.ts:4` usa `max-width: 767px`. Un iPhone apaisado son 844-932px CSS
→ entra por la rama de escritorio, que es `min-w-[820px]` con 7 columnas, en
~390px de alto. Falta detección de orientación o de `pointer: coarse`.

### 2.7 Menús que no cierran al tocar afuera

`Header.tsx:38`, `AccountMenu.tsx:18`, `ProfileSwitcher.tsx:36` y `Modal.tsx:25`
cierran con `mousedown`. iOS solo sintetiza eventos de mouse sobre elementos que
considera clickeables; tocar una zona muerta puede no cerrar el menú. Son cuatro
archivos con el mismo patrón: `pointerdown` los cubre a todos.

---

## Fase 2.5 — Respaldo local ⬜ PENDIENTE (propuesto, más urgente de lo que parece)

**Safari en iOS borra el `localStorage` de sitios que no se abren en 7 días.**
Hoy no hay sync ni respaldo: los datos viven solo en
`weekly-planner-v1-{profileId}` de cada navegador. Un descuido y se pierde todo.

Exportar/importar JSON es barato y cubre el hueco mientras la Fase 3 no exista.
Recomendación: hacerlo **antes** que la Fase 3.

---

## Fase 3 — Sync real con Firestore ⬜ PENDIENTE

Hoy: `firebase` `^12.16.0` está instalado, pero **cero imports de Firestore** en
todo `src/`. `user.uid` no aparece en ningún archivo. El login solo alimenta
`AccountMenu.tsx`.

Perfiles y sesión son dos sistemas que conviven sin conocerse: `profiles.ts:31`
genera el id con `nanoid()` aleatorio por navegador, sin relación con la cuenta.

**El obstáculo real no es escribir código de Firestore**, es temporal:

```ts
// useScheduleStore.ts:338 — se evalúa UNA vez, al importar el módulo
name: 'weekly-planner-v1-' + getActiveProfileId(),
```

La clave de persistencia se resuelve en tiempo de import, pero el `uid` llega
asincrónicamente por `onAuthStateChanged`. Hay dos salidas: re-hidratar el store
cuando aparece el usuario (`persist` expone `setOptions`/`rehydrate`), o un
reload como el que ya hace `switchProfile` (`profiles.ts:61-64`).

Pendientes menores del auth que salieron en la auditoría:

- **Falta `getRedirectResult`.** `useAuth.ts:39-41` usa `signInWithRedirect` en
  móvil pero nunca lo llama. Los errores de ese flujo (popup bloqueado, dominio
  no autorizado) se pierden en silencio: el usuario vuelve sin sesión y sin
  mensaje.
- **Ningún error de auth se muestra.** `useAuth.ts:34-49` no tiene `try/catch`, y
  `AccountMenu.tsx:33` y `:72` llaman las promesas sin `.catch()`.

---

## Otras propuestas ⬜

- **Service worker / offline.** Hoy sin internet la app no abre. Ahora que es
  PWA es el paso natural (`vite-plugin-pwa`).
- **Recordatorios antes de cada bloque.** iOS 16.4+ permite notificaciones web,
  pero solo en PWA instalada — que ya está habilitado.
- **Abrir centrado en la hora actual.** La grilla arranca a las 06:00 y hay que
  scrollear; en el celular se nota.

---

## Configuración de Firebase (hecha)

- Proyecto `weekly-planner-f01a4`, proveedor Google habilitado,
  `joatato.github.io` en dominios autorizados.
- Los seis secrets `VITE_FIREBASE_*` cargados en el repo de GitHub.
- `.github/workflows/deploy.yml` los inyecta en el step de `npm run build`
  (commit `ea38a5e`). Sin ellos `isFirebaseConfigured` da `false` y la app queda
  local-first, que es la degradación deseada.
- `.env.local` creado para desarrollo (gitignoreado).
