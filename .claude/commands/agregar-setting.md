# /agregar-setting — Agregar un ajuste de usuario

Seguí estos pasos cada vez que necesites exponer una nueva opción configurable al usuario.

---

## Archivos involucrados (en orden)

### 1. Declarar el tipo — `src/types/index.ts`

En el interface `AppSettings`, agregar el nuevo campo con su tipo y un comentario de rango si aplica:

```ts
export interface AppSettings {
  // ...campos existentes...
  miNuevaSetting: boolean;   // o number, string, etc.
}
```

### 2. Definir el valor por defecto — `src/lib/constants.ts`

En `DEFAULT_SETTINGS`, agregar el campo:

```ts
export const DEFAULT_SETTINGS: AppSettings = {
  // ...existentes...
  miNuevaSetting: false,
};
```

> El middleware `merge` en `useScheduleStore` fusiona los defaults con los datos guardados, por lo que usuarios existentes recibirán el nuevo default automáticamente sin perder sus datos.

### 3. Consumir el setting en el componente que lo necesite

```ts
const miNuevaSetting = useScheduleStore((s) => s.settings.miNuevaSetting);
```

### 4. Agregar el control en la pantalla de ajustes

Los ajustes de UI viven en `src/components/settings/sections/`:

| Archivo | Qué contiene |
|---|---|
| `GridSettings.tsx` | Horas visibles, altura de slot, fines de semana, formato horario |
| `AppearanceSettings.tsx` | Dark mode, densidad visual |
| `PrintSettings.tsx` | Opciones de impresión A4 |

Elegir la sección correcta o crear una nueva si el setting no encaja en ninguna.

**Patrón de control más común (toggle):**
```tsx
<Toggle
  label="Mi nueva opción"
  description="Descripción breve de qué hace"
  checked={miNuevaSetting}
  onChange={(v) => updateSetting('miNuevaSetting', v)}
/>
```

Usar los componentes UI existentes: `Toggle`, `Slider`, `Input`, `ColorPicker` — todos en `src/components/ui/`.

---

## Reglas

- **No** agregar `useEffect` para reaccionar al cambio de setting — usarlo directamente en el render.
- **No** persistir settings que no son opciones del usuario (ej. estado de UI temporal).
- Settings de número: validar rango en el componente de input, no en el store (el store confía en el UI).
- Si el setting cambia algo visual en la grilla (ej. altura de slot), ya está reactivo: todos los componentes leen `useScheduleStore((s) => s.settings.X)` en el render.

---

## Verificar

Correr `/check` y probar que:
1. El ajuste persiste tras recargar la página
2. Usuarios con localStorage viejo (sin el campo) reciben el default correcto
