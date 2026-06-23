# /nuevo-tipo-bloque — Agregar un tipo de bloque por defecto

Usá este skill cuando el usuario quiera agregar un nuevo tipo de bloque al set de defaults que aparece en instalaciones limpias (o en nuevos perfiles).

> Si el usuario solo quiere agregar un tipo en su instancia actual (sin tocarlo en código), decile que use el botón `+` en la barra lateral — no hace falta tocar código.

---

## Cuándo tocar código

Solo cuando el tipo debe aparecer para todos los usuarios nuevos, como parte de los defaults del producto.

---

## Archivo a editar

`src/lib/constants.ts` — array `DEFAULT_BLOCK_TYPES`

```ts
export const DEFAULT_BLOCK_TYPES: BlockType[] = [
  { id: 'desayuno', name: 'Desayuno', color: '#FDE68A', textColor: '#1f2937' },
  // ... agregar aquí
];
```

## Reglas para el nuevo tipo

1. **`id`**: slug en minúsculas sin espacios, único entre los defaults. Ej: `'ejercicio'`
2. **`name`**: nombre en español, primera letra mayúscula. Ej: `'Ejercicio'`
3. **`color`**: elegir de `COLOR_PALETTE` (definida en el mismo archivo) o cualquier hex pastel que armonice con la paleta existente
4. **`textColor`**: usar `getContrastTextColor(color)` de `src/lib/blockUtils.ts` para calcularlo correctamente, o elegir manualmente:
   - Colores claros (pasteles) → `'#1f2937'` (gris oscuro)
   - Colores muy saturados/oscuros → `'#ffffff'`

## Paleta de referencia (colores actuales)

```
Desayuno  #FDE68A  (amber-200)
Higiene   #C4B5FD  (violet-300)
Trabajo   #A7F3D0  (emerald-200)
Estudio   #BFDBFE  (blue-200)
Almuerzo  #FBCFE8  (pink-200)
Comprar   #BEF264  (lime-300)
Orden     #FED7AA  (orange-200)
Cena      #FBCFE8  (pink-200)
```

## Verificación

1. El nuevo tipo debe aparecer en el array `DEFAULT_BLOCK_TYPES`
2. Correr `/check` para confirmar que no hay errores de tipo
3. Recordar: los usuarios existentes **no verán el cambio** automáticamente (sus datos están en localStorage). El tipo nuevo solo aparece en perfiles nuevos o tras limpiar el almacenamiento.
