import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  getProfiles,
  getActiveProfile,
  createProfile,
  switchProfile,
  renameProfile,
  deleteProfile,
  type Profile,
} from '../../lib/profiles';

export function ProfileSwitcher() {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>(getProfiles);
  const active = getActiveProfile();

  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Cerrar al tocar fuera — `pointerdown` cubre mouse y dedo por igual
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreatingNew(false);
        setRenamingId(null);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  useEffect(() => {
    if (creatingNew) newInputRef.current?.focus();
  }, [creatingNew]);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const profile = createProfile(name);
    switchProfile(profile.id); // hace reload
  };

  const handleRename = (id: string) => {
    renameProfile(id, renameName.trim());
    setProfiles(getProfiles());
    setRenamingId(null);
  };

  const handleDelete = (id: string) => {
    deleteProfile(id); // hace reload si era el activo
    setProfiles(getProfiles());
  };

  const initial = active.name.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
          {initial}
        </span>
        <span className="max-w-[100px] truncate text-sm font-medium text-gray-700 dark:text-gray-200">
          {active.name}
        </span>
        <ChevronDown size={14} className="shrink-0 text-gray-400" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="py-1">
            {profiles.map((profile) => (
              <div key={profile.id} className="group flex items-center gap-1 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800">
                {renamingId === profile.id ? (
                  <form
                    className="flex flex-1 items-center gap-1"
                    onSubmit={(e) => { e.preventDefault(); handleRename(profile.id); }}
                  >
                    <input
                      ref={renameInputRef}
                      value={renameName}
                      onChange={(e) => setRenameName(e.target.value)}
                      className="flex-1 rounded border border-indigo-300 px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <button type="submit" className="rounded p-0.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950">
                      <Check size={14} />
                    </button>
                    <button type="button" onClick={() => setRenamingId(null)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <X size={14} />
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      className="flex flex-1 items-center gap-2 rounded px-1 py-0.5 text-left text-sm text-gray-700 dark:text-gray-200"
                      onClick={() => { if (profile.id !== active.id) switchProfile(profile.id); else setOpen(false); }}
                    >
                      <Check size={14} className={profile.id === active.id ? 'text-indigo-600' : 'invisible'} />
                      <span className="truncate">{profile.name}</span>
                    </button>
                    <button
                      onClick={() => { setRenamingId(profile.id); setRenameName(profile.name); }}
                      className="flex rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 lg:hidden lg:p-0.5 lg:group-hover:flex"
                      title="Renombrar"
                    >
                      <Pencil size={13} />
                    </button>
                    {profiles.length > 1 && (
                      <button
                        onClick={() => handleDelete(profile.id)}
                        className="flex rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 lg:hidden lg:p-0.5 lg:group-hover:flex"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Nuevo perfil */}
          <div className="border-t border-gray-100 p-2 dark:border-gray-800">
            {creatingNew ? (
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
              >
                <input
                  ref={newInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre del perfil"
                  className="flex-1 rounded border border-indigo-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                />
                <button type="submit" className="rounded p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950">
                  <Check size={14} />
                </button>
                <button type="button" onClick={() => { setCreatingNew(false); setNewName(''); }} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X size={14} />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCreatingNew(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <Plus size={14} />
                Nuevo perfil
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
