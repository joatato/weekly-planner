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
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 p-2 dark:border-gray-700 md:w-52 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={cn(
            'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left',
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
