// Traduce un elemento del DOM a algo que se pueda nombrar en una conversación:
// el bloque al que pertenece y qué se ve ahí.
//
// El original (DulceAventura) también sacaba archivo:línea leyendo la fibra
// interna de React (`_debugSource`). React 19 eliminó ese campo, así que ese
// mecanismo no da nada y no se porta ni se reemplaza: no hay forma pública de
// recuperar archivo:línea en producción ni en dev con React 19.
//
// Lo único que queda —y lo único confiable de los dos— es `data-bloque`
// (ver docs/MAPA-UI.md en DulceAventura): se escribe a mano en el JSX, así
// que sobrevive al build de producción y da el nombre humano del bloque.

export interface Identidad {
  /** Nombre estable del bloque, o null si el elemento no está dentro de uno. */
  bloque: string | null;
  /** Tag del elemento tocado (`button`, `div`…), en minúscula. */
  etiqueta: string;
  /** Texto que se ve en pantalla, recortado. Para ubicar de qué se habla. */
  texto: string;
}

/** El bloque más cercano hacia arriba, o null si no hay ninguno. */
export function bloqueDe(el: Element): HTMLElement | null {
  return el.closest<HTMLElement>('[data-bloque]');
}

export function textoVisible(el: Element): string {
  const etiqueta = el.getAttribute('aria-label') ?? el.getAttribute('title');
  const crudo = etiqueta ?? el.textContent ?? '';
  const limpio = crudo.replace(/\s+/g, ' ').trim();
  return limpio.length > 70 ? `${limpio.slice(0, 70)}…` : limpio;
}

export function identificar(el: Element): Identidad {
  const contenedor = bloqueDe(el);
  return {
    bloque: contenedor?.dataset.bloque ?? null,
    etiqueta: el.tagName.toLowerCase(),
    texto: textoVisible(el),
  };
}
