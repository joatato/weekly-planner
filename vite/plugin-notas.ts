// Recibe las notas del modo editor y las escribe en .notas/ (gitignoreado).
//
// Existe para sacarle un paso al circuito: sin esto hay que copiar la nota al
// portapapeles y pegarla en el chat. Con esto la nota queda en el repo y se
// leen todas juntas con /notas.
//
// Solo en `npm run dev` (`apply: 'serve'`): en producción no hay servidor
// nuestro y el cliente cae solo al fallback de descargar o copiar.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

const CARPETA = '.notas';
/** Una captura de pantalla en base64 pesa lo suyo; más que esto es un error. */
const MAX_BYTES = 12 * 1024 * 1024;

export default function pluginNotas(): Plugin {
  return {
    name: 'planner-notas',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__nota', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }

        let cuerpo = '';
        let excedido = false;

        req.on('data', (trozo) => {
          if (excedido) return;
          cuerpo += trozo;
          if (cuerpo.length > MAX_BYTES) {
            excedido = true;
            res.statusCode = 413;
            res.end(JSON.stringify({ ok: false, error: 'La nota es demasiado grande' }));
            req.destroy();
          }
        });

        req.on('end', () => {
          if (excedido) return;
          try {
            const { nombre, markdown, imagen } = JSON.parse(cuerpo) as {
              nombre: string;
              markdown: string;
              imagen?: string | null;
            };

            // El nombre viene del navegador: se lo limpia antes de tocar el
            // disco para que no pueda escaparse de la carpeta.
            const seguro = String(nombre).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 120);
            if (!seguro) throw new Error('Nombre de nota vacío');

            const carpeta = join(server.config.root, CARPETA);
            mkdirSync(carpeta, { recursive: true });
            writeFileSync(join(carpeta, `${seguro}.md`), markdown, 'utf8');

            if (imagen) {
              const base64 = imagen.replace(/^data:image\/\w+;base64,/, '');
              writeFileSync(join(carpeta, `${seguro}.png`), Buffer.from(base64, 'base64'));
            }

            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: true, archivo: `${CARPETA}/${seguro}.md` }));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: String(error) }));
          }
        });
      });
    },
  };
}
