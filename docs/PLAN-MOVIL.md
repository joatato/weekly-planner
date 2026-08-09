# Plan: móvil, PWA y sincronización

Estado al 2026-08-08. La rama `feat/pwa-movil` ya está mergeada a `main`.

## Dónde estamos

| Ítem | Estado |
|---|---|
| Fase 1 — PWA instalable | ✅ deployada |
| Service worker (abre sin internet) | ✅ commit `2a3aace`, verificado en producción con scope `/weekly-planner/` |
| 2.1 + 2.4 — editar, duplicar y borrar en móvil | ✅ `4e6616b`, barra de acciones del bloque seleccionado |
| 2.2 + 2.5 — swipe al soltar un drag, drawer que tapa la grilla | ✅ `2acb3cf` |
| 2.3 — botones con `hidden group-hover` | ⬜ pendiente |
| 2.6 + 2.7 — iPhone apaisado, menús con `mousedown` | ⬜ pendiente |
| Fase 2.5 — exportar/importar JSON | ❌ **descartada**: es tarea manual y no se va a usar. La reemplaza la Fase 3 |
| Fase 3 — sync | 🟡 **desbloqueada**, ver abajo |

**Los pendientes de auth de la Fase 3 ya están hechos** (commit `2ec7b7a`), y la
causa raíz no era la que dice más abajo: ver la nota en la Fase 3.

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

### Estado y diseño decidido (2026-08-08)

**La base ya existe.** Firestore creado en `southamerica-east1`, base `(default)`,
con reglas publicadas que solo dejan a cada usuario tocar lo que cuelga de su
propio `uid`. Verificado: el endpoint REST pasó de "API has not been used" a
`PERMISSION_DENIED`, que es la respuesta correcta sin sesión.

**No hay que escribir un motor de sincronización.** Firestore ya guarda en
IndexedDB, sirve lecturas desde ahí sin red, encola las escrituras y las manda
al reconectar. Se enciende con `persistentLocalCache`, no se construye.

**Un documento por bloque**, y esto no es negociable:
`users/{uid}/perfiles/{profileId}/bloques/{blockId}`. Firestore resuelve
conflictos con "gana el último que escribe". Con el semanal entero en un
documento, editar sin señal en el teléfono y después en la compu hace que uno
de los dos se lleve puesto al otro completo. Con un documento por bloque se
fusionan solos salvo que se toque exactamente el mismo bloque.

**Cada perfil sincroniza por separado**, no la cuenta entera. Es la opción que
no rompe la función de perfiles múltiples y que se comporta igual que "la cuenta
es el semanal" si solo se usa uno.

**Esto esquiva el obstáculo temporal de arriba**: `localStorage` sigue como está,
con su clave resuelta al importar el módulo, y la capa de Firestore vive aparte
indexada por `uid`. No hay que rehidratar el store ni recargar.

Los dos momentos delicados, para no olvidarlos: **la primera fusión** cuando se
entra con la cuenta en un dispositivo que ya tiene datos locales (se resuelve con
un `updatedAt` por bloque), y **borrar sin señal en un dispositivo mientras se
edita en el otro**, que ningún sistema de este tipo resuelve solo.

### Pendientes de auth: ya hechos (commit `2ec7b7a`)

`getRedirectResult` se llama, y los errores se muestran en el header con mensaje
propio para `unauthorized-domain`.

**Pero la causa raíz del login roto en móvil no era esa**, y conviene que quede
escrito: `signInWithRedirect` está roto en `joatato.github.io` porque el dominio
de la app difiere del `authDomain` y los navegadores particionan el storage de
terceros (Safari y todo iOS, Chrome con cookies de terceros bloqueadas). Ahora
usa `signInWithPopup` siempre, con el redirect solo como plan B. **No lo
"restaures" a redirect en móvil**: vuelve el bug, y es mudo.

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
