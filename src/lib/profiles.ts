import { nanoid } from 'nanoid';

export interface Profile {
  id: string;
  name: string;
}

const PROFILES_KEY = 'weekly-planner-profiles';
const ACTIVE_KEY = 'weekly-planner-active-profile';

export function getProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Profile[];
  } catch {
    return [];
  }
}

function saveProfiles(profiles: Profile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

/** Retorna el id del perfil activo. Si no existe ninguno, crea "Mi semanal" y lo activa. */
export function getActiveProfileId(): string {
  let profiles = getProfiles();

  // Bootstrap: primera vez que se usa la app
  if (profiles.length === 0) {
    const first: Profile = { id: nanoid(), name: 'Mi semanal' };
    profiles = [first];
    saveProfiles(profiles);
    localStorage.setItem(ACTIVE_KEY, first.id);
    return first.id;
  }

  const active = localStorage.getItem(ACTIVE_KEY);
  // Verificar que el id activo existe en la lista
  if (active && profiles.some((p) => p.id === active)) return active;

  // Fallback: activar el primero
  const fallbackId = profiles[0].id;
  localStorage.setItem(ACTIVE_KEY, fallbackId);
  return fallbackId;
}

export function getActiveProfile(): Profile {
  const id = getActiveProfileId();
  return getProfiles().find((p) => p.id === id)!;
}

export function createProfile(name: string): Profile {
  const profile: Profile = { id: nanoid(), name: name.trim() || 'Perfil' };
  const profiles = getProfiles();
  profiles.push(profile);
  saveProfiles(profiles);
  return profile;
}

export function switchProfile(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
  window.location.reload();
}

export function renameProfile(id: string, name: string): void {
  const profiles = getProfiles().map((p) =>
    p.id === id ? { ...p, name: name.trim() || p.name } : p,
  );
  saveProfiles(profiles);
}

export function deleteProfile(id: string): void {
  let profiles = getProfiles().filter((p) => p.id !== id);
  if (profiles.length === 0) {
    const fallback: Profile = { id: nanoid(), name: 'Mi semanal' };
    profiles = [fallback];
  }
  saveProfiles(profiles);
  // Si se eliminó el activo, cambiar al primero
  const active = localStorage.getItem(ACTIVE_KEY);
  if (active === id) {
    switchProfile(profiles[0].id); // hace reload
  }
}
