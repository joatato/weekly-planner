// Baja a `.notas/` las notas que se escribieron desde el celular.
//
// Cierra el circuito: el teléfono sube a Firestore (no tiene dónde escribir un
// archivo), y la compu —que sí tiene el dev server del plugin de notas— las
// pasa a disco. Después `/notas` las lee como siempre, sin saber de dónde
// vinieron.
//
// Sólo corre con `npm run dev`: fuera de ahí no existe el endpoint `/__nota`
// y no habría dónde dejarlas.

import { useEffect } from 'react';
import type { User } from 'firebase/auth';

import { construirMarkdown, nombreArchivo } from '../lib/notas';

export function useNotasDeLaNube(user: User | null): void {
  useEffect(() => {
    if (!import.meta.env.DEV || !user) return;

    let vivo = true;
    (async () => {
      try {
        const { bajarNotas, borrarNota } = await import('../lib/puenteNotas');
        const notas = await bajarNotas();
        if (!vivo || notas.length === 0) return;

        for (const nota of notas) {
          if (!vivo) return;
          const res = await fetch('/__nota', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              nombre: nombreArchivo(nota),
              markdown: construirMarkdown(nota),
              imagen: nota.imagen ?? null,
            }),
          });
          // Se borra de la nube recién cuando el archivo ya está en disco. Al
          // revés se perdería la nota si el dev server falla justo acá.
          if (res.ok) await borrarNota(nota.id);
        }
        console.info(`[notas] ${notas.length} nota(s) bajadas de la cuenta a .notas/`);
      } catch {
        // Sin conexión o sin permisos: se reintenta solo la próxima vez que
        // arranque la app. No hay nada que avisarle a nadie acá.
      }
    })();

    return () => {
      vivo = false;
    };
  }, [user]);
}
