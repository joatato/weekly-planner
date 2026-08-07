// Genera docs/MAPA-UI.md: el catálogo de los nombres de bloque que muestra el
// modo editor. Sirve para pedir un cambio sin abrir la app ("cambiá
// reportes.margen-producto") y para que los nombres no se dupliquen sin querer.
//
//   npm run mapa
//
// Lee los atributos tal como están escritos en el JSX: data-bloque="..." en los
// elementos del DOM, y bloque="..." en Modal (que en este repo tampoco reparte
// el resto de las props y lo recibe como prop propia).

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(RAIZ, 'src');
const SALIDA = join(RAIZ, 'docs', 'MAPA-UI.md');

const PATRON = /(?:data-)?bloque=["']([a-z0-9-]+(?:\.[a-z0-9-]+)?)["']/g;

/** Todos los .tsx de src/, ordenados para que el diff sea estable. */
function archivos(dir) {
  return readdirSync(dir)
    .sort()
    .flatMap((nombre) => {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) return archivos(ruta);
      return ruta.endsWith('.tsx') ? [ruta] : [];
    });
}

const hallazgos = [];
for (const ruta of archivos(SRC)) {
  const lineas = readFileSync(ruta, 'utf8').split('\n');
  lineas.forEach((linea, i) => {
    for (const m of linea.matchAll(PATRON)) {
      hallazgos.push({
        nombre: m[1],
        archivo: relative(RAIZ, ruta).split(sep).join('/'),
        linea: i + 1,
      });
    }
  });
}

// Un mismo nombre puede aparecer varias veces (las filas de una lista, o un
// componente compartido). Se agrupan para no repetir la fila del cuadro.
const porNombre = new Map();
for (const h of hallazgos) {
  if (!porNombre.has(h.nombre)) porNombre.set(h.nombre, []);
  porNombre.get(h.nombre).push(h);
}

// El prefijo antes del punto es la página. Los que no tienen punto son
// transversales (aparecen en varias pantallas).
const porGrupo = new Map();
for (const [nombre, usos] of porNombre) {
  const grupo = nombre.includes('.') ? nombre.split('.')[0] : 'compartidos';
  if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
  porGrupo.get(grupo).push({ nombre, usos });
}

const lineas = [
  '# Mapa de la interfaz',
  '',
  'Generado por `npm run mapa`. **No editar a mano.**',
  '',
  'Cada bloque de la app tiene un nombre estable. Con el modo editor prendido',
  '(`Ctrl+Shift+E`) se ven en pantalla; desde acá se pueden nombrar sin abrir',
  'nada: "cambiá `calendar.week-grid`".',
  '',
  `${porNombre.size} bloques en ${porGrupo.size} grupos.`,
  '',
];

for (const grupo of [...porGrupo.keys()].sort()) {
  lineas.push(`## ${grupo}`, '', '| Bloque | Dónde vive |', '|---|---|');
  for (const { nombre, usos } of porGrupo.get(grupo).sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    const donde = usos.map((u) => `\`${u.archivo}:${u.linea}\``).join('<br>');
    lineas.push(`| \`${nombre}\` | ${donde} |`);
  }
  lineas.push('');
}

mkdirSync(join(RAIZ, 'docs'), { recursive: true });
writeFileSync(SALIDA, lineas.join('\n'), 'utf8');
console.log(`docs/MAPA-UI.md: ${porNombre.size} bloques`);
