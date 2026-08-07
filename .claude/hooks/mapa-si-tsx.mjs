// Regenera docs/MAPA-UI.md cuando se toca un .tsx que declara un bloque.
//
// El mapa lo escribe scripts/mapa-ui.mjs y es la única forma de saber qué
// nombres de bloque existen sin abrir la app. Si se regenera solo a mano, se
// desactualiza el día que alguien agrega un data-bloque y se olvida.
//
// Filtra fuerte antes de hacer nada: la mayoría de las ediciones no son .tsx,
// y de las que lo son casi ninguna toca un bloque. Así el caso común sale por
// el return de arriba y no cuesta nada.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

let crudo = '';
process.stdin.on('data', (trozo) => (crudo += trozo));
process.stdin.on('end', async () => {
  try {
    const ruta = JSON.parse(crudo)?.tool_input?.file_path ?? '';
    if (!ruta.endsWith('.tsx')) return;

    // El archivo puede haber sido borrado, o la ruta venir de otra máquina.
    let contenido;
    try {
      contenido = readFileSync(ruta, 'utf8');
    } catch {
      return;
    }
    if (!/(?:data-)?bloque=/.test(contenido)) return;

    // El generador hace su trabajo al importarse. Se lo importa en este mismo
    // proceso en vez de spawnear otro node, y se le tapa el console.log para
    // no ensuciar la salida del hook.
    const log = console.log;
    console.log = () => {};
    try {
      await import(`${pathToFileURL(join(RAIZ, 'scripts', 'mapa-ui.mjs')).href}?t=${Date.now()}`);
    } finally {
      console.log = log;
    }
  } catch {
    // Un hook que falla no tiene que interrumpir el trabajo de nadie.
  }
});
