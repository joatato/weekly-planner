// Captura de pantalla para adjuntar a una nota.
//
// Usa getDisplayMedia (la API nativa de "compartir pantalla") en vez de una
// librería tipo html2canvas: no agrega dependencias y el resultado es lo que
// realmente se ve, incluidos los gráficos de recharts, que las librerías que
// redibujan el DOM suelen romper.
//
// El permiso se pide una sola vez por sesión y el stream queda vivo: cada nota
// después saca un cuadro y listo. No existe en iOS Safari; ahí el botón de
// captura no aparece.

let stream: MediaStream | null = null;
let video: HTMLVideoElement | null = null;

export function capturaDisponible(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function';
}

export function capturaLista(): boolean {
  return stream != null && stream.active;
}

function esperarCuadros(cantidad: number): Promise<void> {
  return new Promise((listo) => {
    let restantes = cantidad;
    const tick = () => (restantes-- > 0 ? requestAnimationFrame(tick) : listo());
    tick();
  });
}

/**
 * Pide permiso y deja el stream listo. Tiene que llamarse desde un click del
 * usuario: los navegadores no dejan abrir el selector de pantalla sin gesto.
 */
export async function prepararCaptura(): Promise<boolean> {
  if (capturaLista()) return true;
  if (!capturaDisponible()) return false;

  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      // `preferCurrentTab` es de Chrome y no está en los tipos del DOM: hace
      // que el selector venga con esta pestaña ya elegida.
      video: { displaySurface: 'browser' },
      preferCurrentTab: true,
    } as DisplayMediaStreamOptions);
  } catch {
    // El usuario canceló el selector, o el navegador no lo permite.
    stream = null;
    return false;
  }

  // Si se corta la compartición desde la barra del navegador, hay que volver
  // a pedirla la próxima vez.
  stream.getVideoTracks()[0]?.addEventListener('ended', soltarCaptura);

  video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  await video.play().catch(() => undefined);
  return true;
}

/**
 * Saca un cuadro, con la interfaz del modo editor escondida para que no tape
 * lo que se quiere mostrar. El recuadro del bloque sí queda: es justamente lo
 * que hace entendible la captura.
 */
export async function tomarCaptura(): Promise<string | null> {
  if (!capturaLista() || !video) return null;

  const ui = Array.from(document.querySelectorAll<HTMLElement>('[data-editor-ui]'));
  for (const el of ui) el.style.visibility = 'hidden';
  // Dos cuadros: uno para que el navegador repinte sin la interfaz y otro para
  // que ese repintado llegue al stream.
  await esperarCuadros(2);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (canvas.width === 0 || canvas.height === 0) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  } finally {
    for (const el of ui) el.style.visibility = '';
  }
}

export function soltarCaptura(): void {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  video = null;
}
