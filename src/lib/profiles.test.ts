import { beforeEach, describe, expect, it } from 'vitest';
import { aplicarNombreRemoto, getProfiles, renameProfile, type Profile } from './profiles';

const PROFILES_KEY = 'weekly-planner-profiles';

function sembrar(profiles: Profile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

describe('aplicarNombreRemoto', () => {
  beforeEach(() => localStorage.clear());

  it('acepta el nombre de la nube cuando el perfil nunca se renombró acá', () => {
    sembrar([{ id: 'a', name: 'Mi semanal' }]);
    expect(aplicarNombreRemoto('a', 'Trabajo', 1000)).toBe(true);
    expect(getProfiles()[0].name).toBe('Trabajo');
  });

  it('acepta un renombre más nuevo que el local', () => {
    sembrar([{ id: 'a', name: 'Viejo', renamedAt: 1000 }]);
    expect(aplicarNombreRemoto('a', 'Nuevo', 2000)).toBe(true);
    expect(getProfiles()[0].name).toBe('Nuevo');
  });

  // El caso que rompía todo: renombrar sin señal y que al reconectar el nombre
  // viejo que seguía en la nube se lo lleve puesto.
  it('rechaza un renombre más viejo que el local', () => {
    sembrar([{ id: 'a', name: 'Renombrado sin señal', renamedAt: 5000 }]);
    expect(aplicarNombreRemoto('a', 'El viejo de la nube', 1000)).toBe(false);
    expect(getProfiles()[0].name).toBe('Renombrado sin señal');
  });

  it('no toca nada si el nombre ya es el mismo', () => {
    sembrar([{ id: 'a', name: 'Igual', renamedAt: 1000 }]);
    expect(aplicarNombreRemoto('a', 'Igual', 9999)).toBe(false);
  });

  it('ignora un id que no existe y un nombre vacío', () => {
    sembrar([{ id: 'a', name: 'Mi semanal' }]);
    expect(aplicarNombreRemoto('desconocido', 'X', 1000)).toBe(false);
    expect(aplicarNombreRemoto('a', '', 1000)).toBe(false);
    expect(getProfiles()[0].name).toBe('Mi semanal');
  });

  it('solo toca el perfil nombrado', () => {
    sembrar([
      { id: 'a', name: 'Uno' },
      { id: 'b', name: 'Dos' },
    ]);
    aplicarNombreRemoto('b', 'Dos renombrado', 1000);
    expect(getProfiles().map((p) => p.name)).toEqual(['Uno', 'Dos renombrado']);
  });
});

describe('renameProfile', () => {
  beforeEach(() => localStorage.clear());

  it('sella la fecha, que es lo que después decide quién gana', () => {
    sembrar([{ id: 'a', name: 'Antes' }]);
    renameProfile('a', 'Después');
    const [p] = getProfiles();
    expect(p.name).toBe('Después');
    expect(p.renamedAt).toBeTypeOf('number');
  });

  it('un nombre vacío no renombra ni sella', () => {
    sembrar([{ id: 'a', name: 'Antes' }]);
    renameProfile('a', '   ');
    const [p] = getProfiles();
    expect(p.name).toBe('Antes');
    expect(p.renamedAt).toBeUndefined();
  });

  it('un renombre local le gana a la nube vieja', () => {
    sembrar([{ id: 'a', name: 'Antes', renamedAt: 1 }]);
    renameProfile('a', 'Local');
    expect(aplicarNombreRemoto('a', 'Nube vieja', 2)).toBe(false);
    expect(getProfiles()[0].name).toBe('Local');
  });
});
