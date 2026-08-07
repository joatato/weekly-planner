# /notas — Leer y aplicar las notas del modo editor

Cuando te invoquen con `/notas`, seguí este proceso en orden.

---

## 1. Leer

Listá `.notas/*.md`. Si la carpeta no existe o no tiene archivos `.md`, decilo
y parate ahí: no hay nada que hacer, no inventes trabajo.

Si hay notas, leelas todas antes de seguir.

## 2. Agrupar por bloque, no por archivo

Cada nota trae un `# nombre-del-bloque` (el `data-bloque` de donde se anotó).
Agrupá las notas por ese nombre: varias notas sobre `calendar.week-grid` son
un solo encargo, no tres, aunque terminen tocando archivos distintos. Ese
agrupamiento es el punto de este comando. Una nota sin bloque (título "Bloque
sin nombre") va aparte; agrupala con otras solo si el contenido realmente
coincide.

## 3. Ubicar el archivo y resumir

Buscá el nombre de cada bloque en `docs/MAPA-UI.md` (tabla bloque →
`archivo:línea`; se regenera con `npm run mapa` si algo no aparece). Con eso,
escribí una línea por grupo: qué se pide y en qué archivo cae.

Si un grupo junta notas con pedidos contradictorios, o que ya no aplican
porque la UI cambió desde que se escribieron, decilo en el resumen — no
elijas una versión por tu cuenta.

## 4. Presentar el plan y esperar el OK

Mostrá la lista de grupos con su resumen y pará ahí. **No toques código
todavía.** Una nota es un pedido, no una orden aprobada: puede estar mal
entendida, pedir algo que ya no corresponde, o pisar un cambio en curso.
Esperá la confirmación del usuario — puede aprobar todo, descartar un grupo,
o pedir que ajustes el resumen antes de seguir.

## 5. Repartir

Con el OK, repartí el trabajo a agentes `ejecutar`: **uno por archivo, no uno
por nota** (la regla de delegación de `CLAUDE.md`). Si un grupo toca varios
archivos, son varios agentes; si varios grupos caen en el mismo archivo, es
un solo agente con el brief de todos juntos. Armale a cada uno el encargo con
lo que sacaste de las notas del grupo: qué se pide, el archivo, la línea de
partida.

## 6. Cerrar

Cuando un grupo quede resuelto, borrá los `.md` (y el `.png` al lado, si lo
tiene) que lo componían. Una nota aplicada que sigue en `.notas/` se vuelve a
leer y aplicar la próxima vez que corra `/notas`.

Los grupos que no se tocaron —porque se descartaron en el plan o porque el
agente no pudo terminarlos— quedan en la carpeta: decí cuáles son y por qué.

---

## Cuidado con lo que copiás

La sección "Cómo llegué" y el texto libre de una nota pueden traer datos
reales de la pantalla de quien anotó: horarios, nombres, lo que hubiera
cargado en ese momento. No los repitas en un mensaje de commit ni los
saques de esta conversación.
