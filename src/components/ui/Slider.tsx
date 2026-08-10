interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  formatValue?: (value: number) => string;
}

export function Slider({ label, min, max, step, value, onChange, unit = '', formatValue }: SliderProps) {
  const display = formatValue ? formatValue(value) : `${value}${unit}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <span className="min-w-[3rem] text-right text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {display}
        </span>
      </div>
      {/* El área que responde al dedo es la caja del <input>, no lo que se ve.
          Con `h-1.5` eran 6 px de alto: en el teléfono no se agarra. Ahora la
          caja mide 24 px y la vía se dibuja aparte, con `::-*-track`, así que
          se sigue viendo fina. El `mt` del pulgar lo centra sobre la vía:
          (6 − 16) / 2. */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer appearance-none bg-transparent
          [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-200 dark:[&::-webkit-slider-runnable-track]:bg-gray-700
          [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow
          [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-gray-200 dark:[&::-moz-range-track]:bg-gray-700
          [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-indigo-500"
      />
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
