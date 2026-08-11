# Plan: sonidos y experiencia de uso

Estado al 2026-08-10. Nada de esto está implementado todavía.

---

# Parte 1 — Sonidos

## De dónde partimos

Ya hay sonido en la app, y marca el camino: `BlockAlertModal.tsx:13` genera el
beep de alerta **sintetizado con Web Audio**, con un oscilador y una envolvente
de ganancia. **Cero archivos de audio.**

Eso no es un detalle: hay que sostenerlo. El bundle ya pesa ~1 MB y entero va
al precache del service worker. Un set de diez sonidos en `.mp3` suma 200-400 kB
que se descargan sí o sí en la instalación, y encima habría que meterlos en
`globPatterns`. Sintetizados pesan **0 bytes** y funcionan sin conexión desde el
primer día.

También hay un ajuste `soundEnabled`, hoy todo-o-nada.

## Los cuatro problemas técnicos, antes del diseño

**1. Un solo `AudioContext`, compartido.** Hoy `startAlertSound()` crea uno
nuevo por alerta y lo cierra. Con un sonido por acción eso se rompe: los
navegadores limitan cuántos contextos podés tener abiertos (Safari corta cerca
de 6) y crearlos no es gratis. Va uno solo, en un módulo, reutilizado.

**2. El contexto arranca suspendido.** Igual que pantalla completa, el navegador
exige un gesto: un `AudioContext` creado en la carga nace en `suspended` y no
suena. Se crea perezosamente en el primer toque —el mismo patrón que
`useFullscreenAlAbrir`— y se hace `resume()` ahí.

**3. El arrastre puede disparar decenas de sonidos por segundo.** Un tick por
cada slot mientras redimensionás es una ametralladora. Hace falta un piso de
~60 ms entre sonidos del mismo tipo, y que el tick sólo suene cuando el valor
**cambia**, no en cada `pointermove`.

**4. El ajuste actual no alcanza.** Alguien puede querer la alarma de un bloque
que empieza y no querer un clic cada vez que mueve algo. Son dos cosas
distintas y hoy comparten un booleano.

## Lo que propongo

### El motor: `src/lib/sonidos.ts`

Un módulo chico, sin dependencias, con un `AudioContext` perezoso y una función
por sonido. Nada de librerías: lo que necesitamos son osciladores con
envolvente, que son quince líneas.

```ts
reproducir('crear');   // no hace nada si está en silencio o no hubo gesto aún
```

### La paleta

La clave para que no moleste: **todos cortos (30-120 ms), todos suaves, y
emparentados entre sí** — misma forma de onda, y la dirección del tono cuenta
lo que pasó. Que suenen de la misma familia es lo que hace que un sonido de
interfaz se vuelva invisible en vez de irritante.

| Evento | Sonido | Por qué así |
|---|---|---|
| Crear bloque | Pop ascendente, 80 ms | Algo apareció: el tono sube |
| Mover bloque | Clic seco y grave, 40 ms | No es nuevo, sólo cambió de lugar |
| Borrar bloque | Descendente, 100 ms | La dirección es la metáfora |
| Redimensionar | Tick apenas audible, 20 ms | Como un dial con muescas. Sólo al cambiar de slot |
| Deshacer / rehacer | Dos tonos espejados | Uno baja, el otro sube: son la misma acción al revés |
| Acción inválida | Dos graves rápidos | Lo único que puede permitirse ser feo |
| Alerta de bloque | El que ya existe | No tocar: tiene que cortar por encima del resto |

Fuera de la lista a propósito: **cambiar de semana o de día no suena.** Es la
acción más repetida de la app —en el celular se navega de a un día— y un
sonido ahí se vuelve tortura en el primer minuto.

### El ajuste

`soundEnabled` pasa a tres opciones en vez de un booleano:

| Valor | Qué suena |
|---|---|
| `todo` | Alertas + interfaz |
| `solo-alertas` | **El default.** Sólo el aviso de que arranca un bloque |
| `nada` | Silencio |

Que el default sea `solo-alertas` y no `todo` es deliberado: los sonidos de
interfaz tienen que ser algo que elegís, no algo que te aparece.

Ojo con la migración: hoy `soundEnabled` es booleano y está en `localStorage`
de todos los perfiles. `true` tiene que leerse como `solo-alertas`, no como
`todo`.

### Costo

Cero kB, cero dependencias, cero requests. El módulo entero son ~80 líneas.

---

# Parte 2 — Ideas para la experiencia

Ordenadas por lo que rinden contra lo que cuestan. Verifiqué contra el código
qué existe: `CurrentTimeLine` (la línea de "ahora") **ya está**, así que no
figura acá.

## Lo que yo haría primero

### 1. Deshacer visible — el hueco más grande que tiene el celular

Hoy deshacer vive en `Ctrl+Z` y en el menú kebab. **En el teléfono no hay
teclado**, y si borrás un bloque sin querer tenés que abrir el kebab y buscar
"Deshacer". Para entonces ya no sabés si va a deshacer eso o lo anterior.

Un cartel abajo, tres segundos: *"Bloque borrado — Deshacer"*. Es el patrón
estándar y acá falta. El store ya tiene el historial de zundo: es UI, no lógica.

### 2. Vibración al soltar — Android lo tiene y no lo usamos

`navigator.vibrate(10)` al crear, mover o soltar un bloque. Diez milisegundos,
imperceptible como vibración y decisivo como sensación: es lo que hace que
arrastrar en una pantalla se sienta físico.

Vale doble acá porque **funciona con el teléfono en silencio**, que es como
está la mayor parte del tiempo. iOS lo ignora, así que degrada solo.

### 3. Abrir centrado en la hora actual

La grilla arranca a las 06:00 y hay que scrollear cada vez. La línea de ahora ya
existe: falta que la vista se posicione ahí al abrir. En el celular, que muestra
un día entero, se nota todos los días.

### 4. Bloques que ya pasaron, atenuados

Los bloques de hoy que ya terminaron, al 50%. Sin leer una sola hora, ves de un
vistazo en qué punto del día estás. Es CSS y una comparación de slot contra la
hora actual.

## Lo que cambia para qué sirve la app

### 5. Totales por tipo

En la barra lateral, debajo de cada tipo: **"Trabajo · 32 h"**. Suma los bloques
de la semana visible.

Esta es la más interesante de todas, y no por lo que cuesta: hoy la app te deja
*dibujar* una semana. Con los totales te deja **evaluarla**. "Dije que iba a
entrenar cuatro horas y puse una" es una conversación que hoy no podés tener con
la herramienta, y es la razón por la que la gente arma un planificador.

### 6. Arrastrar sobre la grilla para crear con su duración

Hoy un clic en un slot vacío abre el modal y el bloque nace con duración fija.
Arrastrar de las 9 a las 11 y que nazca de dos horas es como funciona todo
calendario, y ahorra el modal en el caso común.

Ojo: compite con el `TouchSensor` de dnd-kit en táctil. En escritorio es directo;
en el teléfono habría que pensarlo, o dejarlo sólo para escritorio.

## Lo que dejaría para después

- **Buscar un bloque entre semanas.** Útil cuando hay meses cargados; hoy no hay
  volumen que lo justifique.
- **Semana tipo / plantillas.** Copiar y pegar semana ya cubre el 80%.
- **Notificaciones antes de cada bloque.** Ya está en `PLAN-MOVIL.md`. Es la más
  grande de todas y arrastra decisiones propias (permisos, agendado, qué pasa
  con un bloque que otro dispositivo borró).

---

## Mi recomendación en una línea

**Sonidos + vibración juntos** —son el mismo trabajo: la capa de respuesta al
gesto, y comparten el ajuste—, y después **deshacer visible**, que es el arreglo
más barato de la fricción más real que tiene hoy el celular.
