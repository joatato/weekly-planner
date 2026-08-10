import { useEffect, useRef, useState } from 'react';
import { CloudOff, LogIn, LogOut, RefreshCw, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../hooks/useSync';
import { useEnLinea } from '../../hooks/useEnLinea';

/**
 * Botón de sesión (Google) en el header. Si Firebase no está configurado
 * (.env.local vacío) no renderiza nada — la app sigue 100% local.
 *
 * La sincronización se prende acá porque es el único lugar que ya tiene el
 * usuario. Los hooks van antes de cualquier `return` temprano.
 */
export function AccountMenu() {
  const { user, loading, isFirebaseConfigured, error, clearError, signInWithGoogle, signOut } = useAuth();
  const estadoSync = useSync(user);
  const enLinea = useEnLinea();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  if (!isFirebaseConfigured) return null;

  if (loading) {
    return (
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
    );
  }

  if (!user) {
    return (
      <div className="relative shrink-0">
        <button
          onClick={() => signInWithGoogle()}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <LogIn size={16} />
          {/* En el teléfono no entra "Entrar con Google", pero el ícono solo no
              se entiende: va la versión corta. */}
          <span className="sm:hidden">Entrar</span>
          <span className="hidden sm:inline">Entrar con Google</span>
        </button>
        {error && (
          <button
            onClick={clearError}
            title="Descartar"
            className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-left text-xs text-red-600 shadow-lg dark:border-red-900 dark:bg-gray-900 dark:text-red-400"
          >
            {error}
          </button>
        )}
      </div>
    );
  }

  const nombre = user.displayName ?? user.email ?? '';
  // En el teléfono el header ya va apretado: entra el primer nombre, no el
  // completo. Pero algo tiene que entrar, o no se ve que hay sesión iniciada.
  const nombreCorto = nombre.split(' ')[0] || nombre;
  const initial = (nombre || '?').charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white pl-1 pr-2 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
        aria-label="Cuenta"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
            {initial}
          </span>
        )}
        <span className="max-w-[80px] truncate text-sm font-medium text-gray-700 dark:text-gray-200 sm:hidden">
          {nombreCorto}
        </span>
        <span className="hidden max-w-[100px] truncate text-sm font-medium text-gray-700 dark:text-gray-200 sm:inline">
          {nombre}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
            <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
              {user.displayName}
            </p>
            <p className="truncate text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
          </div>

          {/* Sin conexión no es un error: Firestore encola lo que escribas y lo
              manda al volver la red. Vale decirlo, o parece que se perdió. */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-xs dark:border-gray-800">
            {!enLinea ? (
              <>
                <CloudOff size={14} className="shrink-0 text-amber-500" />
                <span className="text-gray-500 dark:text-gray-400">
                  Sin conexión — se guarda igual y sube al reconectar
                </span>
              </>
            ) : estadoSync === 'error' ? (
              <>
                <TriangleAlert size={14} className="shrink-0 text-red-500" />
                <span className="text-red-600 dark:text-red-400">No se pudo sincronizar</span>
              </>
            ) : (
              <>
                <RefreshCw
                  size={14}
                  className={`shrink-0 text-emerald-500 ${estadoSync === 'conectando' ? 'animate-spin' : ''}`}
                />
                <span className="text-gray-500 dark:text-gray-400">
                  {estadoSync === 'sincronizando' ? 'Sincronizado con tu cuenta' : 'Conectando…'}
                </span>
              </>
            )}
          </div>

          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
