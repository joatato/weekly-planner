import { Grid3x3, Palette, Printer } from 'lucide-react';
import { cn } from '../../lib/cn';

export type SettingsSection = 'appearance' | 'grid' | 'print';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance', label: 'Apariencia', icon: <Palette size={18} /> },
  { id: 'grid', label: 'Grilla', icon: <Grid3x3 size={18} /> },
  { id: 'print', label: 'Impresión', icon: <Printer size={18} /> },
];

interface SettingsNavProps {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
}

export function SettingsNav({ active, onChange }: SettingsNavProps) {
  return (
    <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-gray-200 p-3 dark:border-gray-700">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left',
            active === s.id
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
          )}
        >
          {s.icon}
          {s.label}
        </button>
      ))}
    </nav>
  );
}
