// Una nota es un pedido de cambio sobre un bloque concreto de la app: qué
// bloque, qué molesta. El formato de salida es Markdown porque el
// destinatario lo lee como texto, no como pantalla.
//
// Adaptado de DulceAventura/src/lib/notas.ts: sin `ajustes` (no se trasplantó
// el editor de clases en vivo) y sin `origen` (dependía de la fibra de React,
// que bloques.ts ya no provee en React 19).

export type Etiqueta = 'molesta' | 'mejora' | 'roto';

export const ETIQUETAS: { clave: Etiqueta; label: string; emoji: string }[] = [
  { clave: 'molesta', label: 'Me molesta', emoji: '😖' },
  { clave: 'mejora', label: 'Estaría bueno', emoji: '💡' },
  { clave: 'roto', label: 'Está roto', emoji: '🐛' },
];

export interface Nota {
  fecha: string;
  /** Vista de la app donde se tomó: 'calendar' | 'settings'. */
  vista: string;
  pantalla: string;
  bloque: string | null;
  /** El elemento puntual que se tocó: `button · "Nuevo bloque"`. */
  elemento: string;
  texto: string;
  etiqueta: Etiqueta;
  /** Últimos clicks y rutas antes de anotar. Contesta "cómo llegaste ahí". */
  pasos?: string[];
  /** PNG en dataURL. Se guarda al lado del .md, no adentro. */
  imagen?: string | null;
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

/** `2026-08-03-1432` — ordena bien alfabéticamente, que es como se listan. */
export function marcaDeTiempo(d: Date): string {
  return (
    `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}` +
    `-${dosDigitos(d.getHours())}${dosDigitos(d.getMinutes())}`
  );
}

export function nombreArchivo(nota: Nota): string {
  const bloque = (nota.bloque ?? 'sin-bloque').replace(/\./g, '-');
  return `${marcaDeTiempo(new Date(nota.fecha))}-${bloque}`;
}

export function construirMarkdown(nota: Nota): string {
  const d = new Date(nota.fecha);
  const cuando =
    `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}` +
    ` ${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
  const etiqueta = ETIQUETAS.find((e) => e.clave === nota.etiqueta);

  const lineas: string[] = [
    `# ${nota.bloque ?? 'Bloque sin nombre'}`,
    '',
    `${cuando} · vista \`${nota.vista}\` · ${nota.pantalla} · ${etiqueta?.label ?? nota.etiqueta}`,
    '',
    `**Elemento:** ${nota.elemento}`,
  ];

  lineas.push('', '## Qué quiero', '', nota.texto.trim() || '_(sin descripción)_', '');

  if (nota.pasos && nota.pasos.length > 0) {
    lineas.push('## Cómo llegué', '');
    nota.pasos.forEach((paso, i) => lineas.push(`${i + 1}. ${paso}`));
    lineas.push('');
  }

  if (nota.imagen) {
    lineas.push('## Captura', '', `![captura](${nombreArchivo(nota)}.png)`, '');
  }

  return lineas.join('\n');
}

// ─── Entrega ────────────────────────────────────────────────────────────────

export type Destino = 'disco' | 'nube' | 'descarga' | 'portapapeles';

export interface Entrega {
  destino: Destino;
  detalle: string;
}

function descargar(nombre: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Cuatro destinos, en cascada, del mejor al peor:
 *
 * 1. `disco` — con `npm run dev` la escribe el plugin de Vite en `.notas/`.
 * 2. `nube` — con sesión iniciada va a Firestore, y la compu la baja después.
 *    Este es el que evita que en el celular la nota termine descargada adentro
 *    del propio teléfono, que era el comportamiento anterior y no servía para
 *    nada: el pedido quedaba justo donde nadie lo iba a leer.
 * 3. `descarga` — sin sesión no queda otra.
 * 4. `portapapeles` — si ni la descarga se puede.
 */
export async function guardarNota(nota: Nota): Promise<Entrega> {
  const nombre = nombreArchivo(nota);
  const markdown = construirMarkdown(nota);
  const imagen = nota.imagen;

  if (import.meta.env.DEV) {
    try {
      const res = await fetch('/__nota', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre, markdown, imagen: imagen ?? null }),
      });
      const datos = (await res.json()) as { ok?: boolean; archivo?: string };
      if (res.ok && datos.ok && datos.archivo) {
        return { destino: 'disco', detalle: datos.archivo };
      }
    } catch {
      // El servidor de dev no contestó: se sigue con los otros destinos.
    }
  }

  try {
    // `import()` dinámico igual que en useSync: Firestore son ~250 kB que no
    // tienen por qué entrar al arranque de alguien que nunca inicia sesión.
    const { subirNota } = await import('./puenteNotas');
    if (await subirNota(nota)) {
      return { destino: 'nube', detalle: 'subida a tu cuenta' };
    }
  } catch {
    // Sin sesión, sin Firebase, o Firestore rechazó: se descarga.
  }

  try {
    descargar(`${nombre}.md`, new Blob([markdown], { type: 'text/markdown' }));
    if (imagen) {
      const base64 = imagen.replace(/^data:image\/\w+;base64,/, '');
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      descargar(`${nombre}.png`, new Blob([bytes], { type: 'image/png' }));
    }
    return { destino: 'descarga', detalle: `${nombre}.md` };
  } catch {
    await navigator.clipboard.writeText(markdown);
    return { destino: 'portapapeles', detalle: 'copiada al portapapeles' };
  }
}
