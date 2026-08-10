import { collection, doc, getDocs, setDoc, type Firestore } from 'firebase/firestore';

import { getActiveProfileId, getProfiles, switchProfile, type Profile } from './profiles';
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
    .map((d) => ({ id: d.id, name: (d.data().nombre as string | undefined) ?? 'Semanal' }))
    .filter((p) => p.name.length > 0);

  const idsRemotos = new Set(remotos.map((p) => p.id));
  const idsLocales = new Set(localesAntes.map((p) => p.id));

  // Subir los que solo están acá
  for (const p of localesAntes) {
    if (idsRemotos.has(p.id)) continue;
    await setDoc(doc(col, p.id), { nombre: p.name }, { merge: true });
  }

  // Bajar los que solo están en la nube
  const nuevos = remotos.filter((p) => !idsLocales.has(p.id));
  if (nuevos.length > 0) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify([...localesAntes, ...nuevos]));
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
    const lista = [...localesAntes, ...nuevos].filter((p) => p.id !== activoAntes);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(lista));
    localStorage.removeItem('weekly-planner-v1-' + activoAntes);
    switchProfile(destino.id); // recarga
    return true;
  }

  return false;
}

/** Mantiene el nombre del perfil activo al día en la nube. */
export async function guardarNombrePerfil(db: Firestore, uid: string, profile: Profile): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'perfiles', profile.id), { nombre: profile.name }, { merge: true });
}
