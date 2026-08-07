import { useCallback, useEffect, useState } from 'react';

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

function checkSupport(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as FullscreenElement;
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
}

function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function requestFullscreen(el: FullscreenElement): void {
  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen().catch(() => {});
  }
}

function exitFullscreen(doc: FullscreenDocument): void {
  if (doc.exitFullscreen) {
    doc.exitFullscreen().catch(() => {});
  } else if (doc.webkitExitFullscreen) {
    doc.webkitExitFullscreen().catch(() => {});
  }
}

export function useFullscreen() {
  const [isSupported] = useState(checkSupport);
  const [isFullscreen, setIsFullscreen] = useState(() => getFullscreenElement() !== null);

  useEffect(() => {
    const handler = () => setIsFullscreen(getFullscreenElement() !== null);
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  const toggle = useCallback(() => {
    if (getFullscreenElement()) {
      exitFullscreen(document as FullscreenDocument);
    } else {
      requestFullscreen(document.documentElement as FullscreenElement);
    }
  }, []);

  return { isFullscreen, isSupported, toggle };
}
