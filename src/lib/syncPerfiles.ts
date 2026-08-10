import { collection, doc, getDocs, setDoc, type Firestore } from 'firebase/firestore';

import {
  aplicarNombreRemoto,
  getActiveProfileId,
  getProfiles,
  switchProfile,
  type Profile,
} from './profiles';
import { auth } from './firebase';
import { getDb } from './firestore';
import { useScheduleStore } from '../store/useScheduleStore';

const PROFILES_KEY = 'weekly-planner-profiles';

/**
 * Pone de acuerdo la lista de perfiles del navegador con la de la cuenta.
 *
 * Hace falta porque los ids de perfil los genera `nanoid()` en cada navegador
 * (`profiles.ts:31`): sin esto, "Mi semanal" del teléfono y "Mi semanal" de la
 * compu son dos ids distintos y nunca se cruzan, que es justo lo contrario de
 * lo que uno espera al iniciar sesión en los dos lados.
 *
 * Devuelve `true` si va a recargar la página para cambiar de perfil; en ese
 * caso no hay que arrancar la sincronización, la recarga la arranca de nuevo.
 */
export async function reconciliarPerfiles(db: Firestore, uid: string): Promise<boolean> {
  const localesAntes = getProfiles();
  const activoAntes = getActiveProfileId();

  const col = collection(db, 'users', uid, 'perfiles');
  const snap = await getDocs(col);
  const remotos: Profile[] = snap.docs
    .map((d) => ({
      id: d.id,
      name: (d.data().nombre as string | undefined) ?? 'Semanal',
      renamedAt: d.data().nombreEn as number | undefined,
    }))
    .filter((p) => p.name.length > 0);

  const porId = new Map(remotos.map((p) => [p.id, p]));
  const idsLocales = new Set(localesAntes.map((p) => p.id));

  // Subir los que solo están acá, y también los renombres que la nube todavía
  // no vio. Antes se salteaba todo id ya remoto, así que el nombre se escribía
  // una sola vez —al crear el perfil— y ningún renombre posterior salía nunca
  // de este dispositivo.
  for (const p of localesAntes) {
    const remoto = porId.get(p.id);
    if (remoto && (remoto.renamedAt ?? 0) >= (p.renamedAt ?? 0)) continue;
    await setDoc(doc(col, p.id), { nombre: p.name, nombreEn: p.renamedAt ?? 0 }, { merge: true });
  }

  // Bajar los nombres que cambiaron en otro dispositivo. Esto va antes de
  // sumar los ids nuevos: `aplicarNombreRemoto` relee localStorage, y armar la
  // lista final con la copia vieja de `localesAntes` desharía lo recién bajado.
  for (const r of remotos) {
    if (!idsLocales.has(r.id)) continue;
    aplicarNombreRemoto(r.id, r.name, r.renamedAt);
  }

  // Bajar los que solo están en la nube
  const nuevos = remotos.filter((p) => !idsLocales.has(p.id));
  if (nuevos.length > 0) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify([...getProfiles(), ...nuevos]));
  }

  // Adopción: un dispositivo recién estrenado tiene un solo perfil y está
  // vacío. Si la cuenta ya tiene uno, quedarse con el local sería empezar de
  // cero al lado de los datos que ya existen. Se cambia al de la cuenta.
  //
  // Sólo cuando el local está vacío: si tiene bloques, los dos perfiles quedan
  // en la lista y elige la persona. Acá no se borra nada de nadie.
  const soloUnoLocal = localesAntes.length === 1 && localesAntes[0].id === activoAntes;
  const localVacio = Object.keys(useScheduleStore.getState().blocks).length === 0;
  const hayOtroRemoto = remotos.some((p) => p.id !== activoAntes);

  if (soloUnoLocal && localVacio && hayOtroRemoto) {
    const destino = remotos.find((p) => p.id !== activoAntes)!;
    // Relee en vez de rearmar desde `localesAntes`: los pasos de arriba ya
    // escribieron los nombres bajados y los ids nuevos.
    const lista = getProfiles().filter((p) => p.id !== activoAntes);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(lista));
    localStorage.removeItem('weekly-planner-v1-' + activoAntes);
    switchProfile(destino.id); // recarga
    return true;
  }

  return false;
}

/**
 * Sube el nombre de un perfil apenas se lo renombra, sin esperar a la próxima
 * sesión.
 *
 * Reemplaza a `guardarNombrePerfil`, que existía para esto y no la llamaba
 * nadie: era la mitad de por qué los nombres no viajaban entre dispositivos.
 *
 * No hace nada sin sesión ni sin Firebase configurado — la app es local-first y
 * renombrar tiene que andar igual. Lee el nombre de localStorage en vez de
 * recibirlo para no discrepar con lo que `renameProfile` terminó guardando.
 */
export async function subirNombreSiHaySesion(id: string): Promise<void> {
  const uid = auth?.currentUser?.uid;
  if (!uid) return;
  const db = getDb();
  if (!db) return;

  const perfil = getProfiles().find((p) => p.id === id);
  if (!perfil) return;

  await setDoc(
    doc(db, 'users', uid, 'perfiles', id),
    { nombre: perfil.name, nombreEn: perfil.renamedAt ?? Date.now() },
    { merge: true },
  );
}
