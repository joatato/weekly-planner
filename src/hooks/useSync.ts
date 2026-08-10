import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

import { getActiveProfileId } from '../lib/profiles';

export type EstadoSync = 'apagado' | 'conectando' | 'sincronizando' | 'error';

/**
 * Enciende la sincronización mientras haya sesión.
 *
 * Todo `firebase/firestore` entra por `import()` dinámico: son ~250 kB que no
 * tienen por qué pesar en el arranque de alguien que nunca inicia sesión, y la
 * app es local-first justamente para eso.
 */
export function useSync(user: User | null): EstadoSync {
  // Sin sesión el estado se deriva, no se guarda: poner `apagado` desde el
  // cuerpo del efecto es una cascada de renders (react-hooks/set-state-in-effect).
  const [estado, setEstado] = useState<Exclude<EstadoSync, 'apagado'>>('conectando');

  useEffect(() => {
    if (!user) return;

    let vivo = true;
    let cortar: (() => void) | null = null;

    (async () => {
      try {
        const [{ getDb }, { sincronizarPerfil }, { reconciliarPerfiles }] = await Promise.all([
          import('../lib/firestore'),
          import('../lib/sync'),
          import('../lib/syncPerfiles'),
        ]);
        if (!vivo) return;
        setEstado('conectando'); // reintento tras un error previo
        const db = getDb();
        if (!db) return;

        // Si adopta un perfil de la cuenta recarga la página, y la
        // sincronización arranca sola del otro lado de la recarga.
        const recarga = await reconciliarPerfiles(db, user.uid);
        if (recarga || !vivo) return;

        cortar = sincronizarPerfil(db, user.uid, getActiveProfileId(), () => {
          if (vivo) setEstado('error');
        });
        setEstado('sincronizando');
      } catch (err) {
        if (!vivo) return;
        console.error('No se pudo sincronizar', err);
        setEstado('error');
      }
    })();

    return () => {
      vivo = false;
      cortar?.();
    };
  }, [user]);

  return user ? estado : 'apagado';
}
