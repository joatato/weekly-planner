import { Check } from 'lucide-react';
import { COLOR_PALETTE } from '../../lib/constants';
import { cn } from '../../lib/cn';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  palette?: string[];
  label?: string;
  /** Muestra además un selector de color nativo para elegir cualquier tono. */
  showCustom?: boolean;
}

export function ColorPicker({
  value,
  onChange,
  palette = COLOR_PALETTE,
  label = 'Color',
  showCustom = false,
}: ColorPickerProps) {
  const current = value ?? '';
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {palette.map((color) => {
          const selected = color.toLowerCase() === current.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              aria-label={`Color ${color}`}
              aria-pressed={selected}
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-lg transition-transform',
                'hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
                selected && 'ring-2 ring-gray-900 ring-offset-1 dark:ring-white dark:ring-offset-gray-900',
              )}
              style={{ backgroundColor: color }}
            >
              {selected && <Check size={16} className="text-white mix-blend-difference" strokeWidth={3} />}
            </button>
          );
        })}

        {showCustom && (
          <label
            className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600"
            title="Color personalizado"
          >
            <input
              type="color"
              value={current || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Color personalizado"
            />
            <span
              className="h-5 w-5 rounded"
              style={{
                background:
                  'conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)',
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
