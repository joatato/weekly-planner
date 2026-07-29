import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
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
 * Sesión de usuario vía Firebase Auth (Google). La app es local-first:
 * si Firebase no está configurado (.env.local vacío) o no hay usuario,
 * todo sigue funcionando igual que sin cuenta.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: isFirebaseConfigured });

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false });
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    // En móvil el popup suele ser bloqueado/incómodo; redirect funciona mejor.
    const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileUA) {
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
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
    signInWithGoogle,
    signOut,
  };
}
