import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';

interface AuthState {
  user: User | null;
  /** true mientras se resuelve el estado inicial de sesión con Firebase */
  loading: boolean;
}

/**
 * Los errores de Firebase Auth son `FirebaseError` (no exportado como clase
 * desde `firebase/auth`), con `.code` tipo `"auth/algo"`. `catch` en TS
 * strict da `unknown`, así que se valida por forma en vez de castear.
 */
function getAuthErrorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

/** Cancelaciones del popup por el propio usuario: no son errores. */
function isPopupCancellation(code: string) {
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}

function messageForAuthError(code: string): string {
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase. Agregalo en Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de inicio de sesión.';
    default:
      return 'No se pudo iniciar sesión. Intentá de nuevo.';
  }
}

/**
 * Sesión de usuario vía Firebase Auth (Google). La app es local-first:
 * si Firebase no está configurado (.env.local vacío) o no hay usuario,
 * todo sigue funcionando igual que sin cuenta.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: isFirebaseConfigured });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false });
    });
    return unsubscribe;
  }, []);

  // Completa un redirect pendiente (plan B de signInWithGoogle, o de una
  // sesión previa). En el caso normal (sin redirect en curso) resuelve null
  // y no hay nada que mostrar.
  useEffect(() => {
    if (!auth) return;
    let vivo = true;
    getRedirectResult(auth)
      .catch((err: unknown) => {
        if (!vivo) return;
        const code = getAuthErrorCode(err);
        if (isPopupCancellation(code)) return;
        setError(messageForAuthError(code));
      });
    return () => {
      vivo = false;
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) return;
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const code = getAuthErrorCode(err);
      if (isPopupCancellation(code)) return;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        // El popup no es viable: plan B. signInWithRedirect navega fuera de
        // la página, nunca resuelve acá — no hay nada que esperar ni capturar.
        await signInWithRedirect(auth, provider);
        return;
      }
      setError(messageForAuthError(code));
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  return {
    user: state.user,
    loading: state.loading,
    isFirebaseConfigured,
    error,
    clearError: () => setError(null),
    signInWithGoogle,
    signOut,
  };
}
