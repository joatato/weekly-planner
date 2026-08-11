// Las notas del modo editor, contra Firestore.
//
// Antes de esto, fuera de `npm run dev` una nota se **descargaba** al
// dispositivo (ver el destino `descarga` en notas.ts). En el teléfono eso
// significaba que el pedido quedaba ahí adentro y había que mandarlo a mano.
// Acá se sube a `users/{uid}/notas/{id}`, y la compu la baja después.
//
// Las reglas de Firestore ya limitan cada usuario a lo que cuelga de su `uid`,
// así que no hace falta nada nuevo del lado del servidor.

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';

import { auth } from './firebase';
import { getDb } from './firestore';
import type { Nota } from './notas';

/** Un documento de Firestore no puede pasar 1 MB. Una captura de pantalla en
 *  PNG lo pasa cómodo, así que se recomprime antes de subir. Este es el techo
 *  del lado ancho, en píxeles. */
const ANCHO_MAX_CAPTURA = 900;
/** Calidad del JPEG. 0.6 es donde una captura de interfaz sigue siendo legible
 *  —se leen los textos chicos— y pesa del orden de 60-120 kB. */
const CALIDAD_CAPTURA = 0.6;
/** Margen de seguridad contra el límite de 1 MB del documento. El dataURL va
 *  en base64, que infla ~33%, y el resto de la nota también ocupa. */
const PESO_MAX_CAPTURA = 600 * 1024;

/**
 * Reduce y recomprime la captura a JPEG. Devuelve `null` si no se puede, y en
 * ese caso la nota viaja sin imagen en vez de fallar entera: el texto y los
 * pasos son lo que no se puede perder.
 */
export async function comprimirCaptura(dataUrl: string): Promise<string | null> {
  try {
    const img = new Image();
    await new Promise<void>((listo, falla) => {
      img.onload = () => listo();
      img.onerror = () => falla(new Error('no cargó'));
      img.src = dataUrl;
    });

    const escala = Math.min(1, ANCHO_MAX_CAPTURA / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Sin esto, un PNG con transparencia queda con el fondo en negro al pasar
    // a JPEG, que no tiene canal alfa.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const jpeg = canvas.toDataURL('image/jpeg', CALIDAD_CAPTURA);
    return jpeg.length > PESO_MAX_CAPTURA ? null : jpeg;
  } catch {
    return null;
  }
}

export interface NotaEnNube extends Nota {
  id: string;
}

/**
 * Sube una nota. Devuelve `false` si no hay sesión o Firebase no está
 * configurado, y ahí quien llama vuelve al camino viejo (descarga).
 *
 * Sin señal no falla: el SDK encola la escritura en IndexedDB y la manda al
 * reconectar, igual que con los bloques.
 */
export async function subirNota(nota: Nota): Promise<boolean> {
  const uid = auth?.currentUser?.uid;
  if (!uid) return false;
  const db = getDb();
  if (!db) return false;

  const imagen = nota.imagen ? await comprimirCaptura(nota.imagen) : null;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await setDoc(doc(collection(db, 'users', uid, 'notas'), id), {
    fecha: nota.fecha,
    vista: nota.vista,
    pantalla: nota.pantalla,
    bloque: nota.bloque ?? null,
    elemento: nota.elemento,
    texto: nota.texto,
    etiqueta: nota.etiqueta,
    pasos: nota.pasos ?? [],
    imagen,
    subidaEn: Date.now(),
  });
  return true;
}

/** Baja las notas pendientes. Sólo se usa desde la compu, en `npm run dev`. */
export async function bajarNotas(tope = 50): Promise<NotaEnNube[]> {
  const uid = auth?.currentUser?.uid;
  if (!uid) return [];
  const db = getDb();
  if (!db) return [];

  const col = collection(db, 'users', uid, 'notas');
  const snap = await getDocs(query(col, orderBy('subidaEn'), limit(tope)));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      fecha: (x.fecha as string) ?? new Date().toISOString(),
      vista: (x.vista as string) ?? 'calendar',
      pantalla: (x.pantalla as string) ?? '',
      bloque: (x.bloque as string | null) ?? null,
      elemento: (x.elemento as string) ?? '',
      texto: (x.texto as string) ?? '',
      etiqueta: (x.etiqueta as Nota['etiqueta']) ?? 'molesta',
      pasos: (x.pasos as string[]) ?? [],
      imagen: (x.imagen as string | null) ?? null,
    };
  });
}

/** Se borra recién cuando el `.md` ya está escrito en disco, no antes. */
export async function borrarNota(id: string): Promise<void> {
  const uid = auth?.currentUser?.uid;
  if (!uid) return;
  const db = getDb();
  if (!db) return;
  await deleteDoc(doc(db, 'users', uid, 'notas', id));
}
