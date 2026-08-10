import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { firebaseApp } from './firebase';

let db: Firestore | null = null;

/**
 * Firestore con caché persistente en IndexedDB.
 *
 * Esto es lo que hace que la app ande sin conexión: el SDK sirve las lecturas
 * desde IndexedDB, encola las escrituras en su propio outbox y las manda solo
 * al reconectar. No hay motor de sincronización propio en este repo, y no
 * conviene escribir uno.
 *
 * `persistentMultipleTabManager` deja tener varias pestañas abiertas; con el
 * manager de una sola pestaña, la segunda se queda sin caché.
 *
 * Se inicializa perezosamente: `firebase/firestore` son ~250 kB que no tienen
 * por qué entrar al arranque de alguien que nunca inicia sesión.
 */
export function getDb(): Firestore | null {
  if (!firebaseApp) return null;
  if (!db) {
    db = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }
  return db;
}
