// Registro de los últimos pasos: qué se tocó y por dónde se pasó.
//
// Es el "grabador" que sirve de verdad para reportar un problema. Un video no
// se puede leer; esta lista sí, y contesta la pregunta que siempre falta en un
// reporte: cómo llegaste hasta ahí.
//
// Vive solo en memoria, se pisa a sí mismo pasados 40 pasos y no sale de la
// máquina hasta que se guarda una nota. Ojo igual: los textos salen de la
// pantalla, así que pueden traer montos y nombres reales.

import { bloqueDe, textoVisible } from './bloques';

const MAX_PASOS = 40;

const pasos: string[] = [];

function anotar(texto: string): void {
  if (pasos[pasos.length - 1] === texto) return; // no repetir el mismo dos veces
  pasos.push(texto);
  if (pasos.length > MAX_PASOS) pasos.shift();
}

export function anotarRuta(ruta: string): void {
  anotar(`fue a ${ruta}`);
}

export function leerPasos(): string[] {
  return [...pasos];
}

export function limpiarPasos(): void {
  pasos.length = 0;
}

/** Engancha el registro de clicks. Devuelve la función para desengancharlo. */
export function iniciarRegistro(): () => void {
  function alClick(e: MouseEvent) {
    const el = e.target as Element | null;
    // Lo que toca el usuario suele ser el texto adentro del botón; el botón es
    // el que tiene el nombre útil.
    const control = el?.closest('button, a, input, select, [role="button"]') ?? el;
    if (!control || control.closest('[data-editor-ui]')) return;

    const texto = textoVisible(control);
    const bloque = bloqueDe(control)?.dataset.bloque;
    const que = texto ? `"${texto}"` : `<${control.tagName.toLowerCase()}>`;
    anotar(bloque ? `click en ${que} (${bloque})` : `click en ${que}`);
  }

  window.addEventListener('click', alClick, true);
  return () => window.removeEventListener('click', alClick, true);
}
