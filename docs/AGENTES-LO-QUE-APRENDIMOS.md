# Agentes: lo que aprendimos usándolos

Para llevar a **Dulce Aventura**. Todo lo de acá salió de sesiones reales en
Weekly Planner, con números medidos, no con estimaciones.

---

## La idea que cambia todo

> **Un subagente no ahorra crédito: ahorra contexto del hilo principal.**

Esa frase es el documento entero. Todo lo demás son consecuencias.

Es fácil pensar que delegar es "gratis" o que reparte el trabajo. No: cada
subagente **arranca en frío**. No sabe nada del proyecto, no leyó la
conversación, no vio los archivos. Tiene que releerlo todo. Eso tiene un piso
de **~45k tokens aunque la tarea sea de tres líneas**.

Lo único que sí ahorra es el contexto del hilo principal: el subagente lee 20
archivos y devuelve 8 líneas, y esas 8 líneas son lo único que entra en la
conversación principal. Cuando la sesión se está quedando sin contexto, eso
vale oro. Cuando no, es puro costo.

### Los números

| Medición | Resultado |
|---|---|
| 8 subagentes en una sesión | **478k tokens** |
| Uno de ellos, escribiendo 3 archivos markdown | **65k** — el hilo principal lo hacía con 5k |
| `probar` (navegador) en una sola corrida | **84k**, porque los snapshots del navegador son enormes |

Ese subagente de 65k contra 5k es la lección en una línea: **13× más caro por
delegar algo que no había que delegar.**

---

## Cuándo delegar y cuándo no

| Delegá | Hacelo vos |
|---|---|
| Varios archivos **disjuntos** en paralelo | 1-3 archivos, aunque sean varios cambios |
| Tarea larga y mecánica sobre carpetas separadas | Cualquier cosa que un grep o un Edit resuelvan |
| Una búsqueda amplia (`Explore`) | Diseñar, integrar y commitear: eso no se delega nunca |
| La sesión se está por quedar sin contexto | Cuando hay contexto de sobra |

**Regla práctica:** si armar el brief cuesta más que hacer el trabajo, no
delegues. Para un arreglo de una línea, siempre cuesta más.

---

## Las seis reglas

1. **No delegues lo que un grep resuelve.** El subagente arranca en frío.
2. **Cortá por archivo, no por tarea.** Tres pedidos sobre el mismo archivo son
   un agente, no tres.
3. **No reanudes un agente para un chequeo chico.** Reanudar reproduce todo su
   transcript y sale más caro que uno nuevo con brief angosto.
4. **Prohibiles el build** a los que corren en paralelo, o van a perseguir el
   error del archivo a medio guardar del otro.
5. **Que no commiteen.** El commit lo hace el hilo principal, que es el único
   que sabe qué archivo es de quién.
6. **Pediles la respuesta corta, en el brief.** Un agente que devuelve el diff
   pegado te cobra dos veces: al generarlo y al leerlo. Ocho líneas alcanzan
   para qué tocó, si compiló y qué quedó afuera.

---

## El modelo importa más de lo que parece

> **haiku para lo mecánico y observacional, sonnet para lo que escribe código,
> opus nunca en un subagente.**

| Agente | Para qué | Modelo |
|---|---|---|
| `ejecutar` | Aplicar un cambio ya diseñado, 1-3 archivos | sonnet |
| `revisar` | Correr el build y leer el diff | haiku |
| `probar` | Abrir la app en el navegador y mirar | haiku |

Se puede forzar por invocación: si el encargo es copiar, mover o renombrar
archivos, mandalo en haiku aunque el agente declare sonnet.

`probar` es el que más gasta con diferencia y el que menos criterio necesita.
**Lo que lo hace rendir es el brief, no el modelo.**

---

## El brief es lo que hace rentable a un agente

Un agente sin brief corre su checklist genérico y aplica el cambio literal.
Cinco cosas:

1. **De dónde parte** — qué existe ya, qué no, qué está a medio hacer.
2. **Qué hacer**, concreto. Archivo y línea si los sabés.
3. **El modo de fallo que vos ya viste venir.** ← *Esto es lo que más rinde de
   los cinco.* El estado que no se resetea, el valor que puede venir
   `undefined`, lo que anda la primera vez y no la segunda. **Si lo viste y no
   lo escribís, no lo va a ver.**
4. **El alcance** — qué archivos son suyos, nombrados, y cuál es de otro agente.
5. **Su bitácora**, si hay otro agente en paralelo (ver abajo).

---

## Lo más caro que hace un agente: mirar el navegador

Un snapshot del navegador es enorme. `probar` gastó **84k en una sola
corrida** casi entero en eso.

**La regla:** `probar` solo para lo que hay que **ver**. Todo lo que se
**mide** sale mucho más barato con `browser_evaluate` devolviendo un JSON
chico desde el hilo principal.

- ¿Se creó el bloque? ¿cambió de día? ¿desborda el header? → `browser_evaluate`
- ¿Se ve bien? ¿el espaciado quedó raro? → captura, y ahí sí

En una sesión real hicimos toda la verificación de una feature móvil
—navegación de días, botón "Hoy", overlay del modo editor— con seis
`browser_evaluate` que devolvían JSONs de 10 líneas. Cero subagentes.

### Dos trampas de medición que dan falsos negativos

**1. Clicks sincrónicos.** Esto parece que prueba algo y no prueba nada:

```js
for (let i = 0; i < 9; i++) { boton.click(); resultado.push(leerDOM()); }
```

React no re-renderiza dentro del mismo tick, así que el DOM lee siempre lo
mismo y **parece que el botón está roto**. Hay que esperar entre cada uno:

```js
const esperar = () => new Promise(r => setTimeout(r, 60));
for (let i = 0; i < 9; i++) { boton.click(); await esperar(); resultado.push(leerDOM()); }
```

Nos pasó: concluimos "las flechas no andan" cuando lo que estaba mal era el
método.

**2. Eventos táctiles sintéticos.** Despachar `new TouchEvent(...)` con
`dispatchEvent` no activa los sensores de librerías como dnd-kit. Peor: un
`touchend` despachado a mano puede no llegar y dejar un arrastre abierto para
siempre, así que **todo lo que pruebes después también falla**. Los toques de
verdad salen por CDP (`Input.dispatchTouchEvent`).

**Antes de tocar los datos de alguien:** guardá `localStorage` en un archivo
aparte y restauralo al final.

---

## La bitácora: solo si hay dos o más agentes

`.bitacora/` es un `.md` por agente vivo donde cada uno declara **qué archivos
son suyos** antes de tocarlos.

**Por qué existe:** la regla de "commiteá solo lo tuyo" necesita saber de quién
es cada archivo. Sin esto se adivina leyendo diffs ajenos.

**Lo que cuesta y lo que ahorra**, medido en una sesión real:

| | Tokens |
|---|---|
| Escribir el reclamo (al empezar y al terminar) | ~150 |
| Leer las bitácoras ajenas al arrancar | ~200-300 |
| **Total por agente** | **~450** |
| Contra: deducir de quién era un archivo leyendo su diff | **~2000** |

O sea que **en el escenario multi-agente no agrega costo: lo saca.**

**Pero con un agente a la vez es puro costo y cero beneficio.** No hay con
quién colisionar y `git status` te dice todo. Esta es la parte que más fácil se
implementa de más.

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

Se escribe **al empezar** (antes del primer Edit, después no sirve) y **al
terminar**. En el medio nada, salvo que el alcance cambie. No es un diario de
progreso: eso no lo lee nadie y lo paga todo el mundo.

Va gitignoreada. Es estado de una sesión, no historial — el historial es el
`git log`.

---

## Un hook que no es opcional

Si preaprobás `Bash(*)` para que los agentes no pregunten por cada comando,
**necesitás un hook que bloquee los comandos que barren el working tree**:

| Bloqueado | Por qué |
|---|---|
| `git add -A`, `git add .`, `git add -u` | Barren el working tree entero |
| `git commit -a`, `git commit -am` | Commitean todo lo modificado |
| `git reset --hard` | Destruye lo sin commitear de todos |
| `git checkout .`, `git restore .` | Revierte el working tree entero |
| `git clean -f` | Borra archivos que otro agente está escribiendo |

`--amend` se deja pasar: no toca el working tree.

**Detalle que parece menor y no lo es:** el hook tiene que vaciar el texto
citado antes de analizar el comando. Sin eso, un mensaje de commit que diga
"no uses git add -A" **se bloquea a sí mismo**.

---

## Dos cosas que nos mordieron

**Los agentes se cargan al iniciar la sesión.** Un agente recién escrito no
está disponible en la sesión que lo escribió. Hay que reiniciar.

**`git worktree remove` sigue los symlinks.** Si configuraste
`symlinkDirectories: ["node_modules"]` para no reinstalar en cada worktree,
sacar el worktree **vacía el `node_modules` del repo principal**. Se arregla
con `npm install` y no se pierde nada, pero te frena en seco y el error que
tira después ("eslint no se reconoce") no te dice por qué.

---

## Worktrees: cuándo sí

Si dos tareas tocan **archivos distintos**, el working tree compartido alcanza.
Si tocan **los mismos archivos**, usá worktrees o corré las tareas de a una.

Adentro de un worktree el agente puede commitear tranquilo: está solo. Y ahí la
bitácora no aplica — cada worktree tiene la suya y no se ven entre sí, pero los
agentes ya están aislados por construcción, que es el punto.

---

## El resumen en cinco líneas

1. Delegar no reparte trabajo: **mueve contexto y cuesta ~45k de piso**.
2. Si el brief cuesta más que la tarea, **hacelo vos**.
3. Lo que se **mide** va con `browser_evaluate`; lo que se **ve**, con un agente.
4. El brief vale más que el modelo, y **el modo de fallo que ya viste** es la
   parte del brief que más rinde.
5. La bitácora paga con 2+ agentes y **solo con 2+ agentes**.
