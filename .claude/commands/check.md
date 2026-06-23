# /check — Verificar tipos y build

Ejecuta la verificación completa del proyecto en dos pasos:

**Paso 1 — TypeScript (sin compilar):**
```
npx tsc --noEmit
```
Si hay errores de tipo, muéstralos todos y detente. No sigas al paso 2 hasta que el paso 1 pase limpio.

**Paso 2 — Build de producción:**
```
npx vite build
```
Si hay errores de build, muéstralos.

**Resultado esperado:**
- Paso 1: sin output (0 errores)
- Paso 2: línea `✓ built in Xms` con los tres assets listados (index.html, index.css, index.js)

Si ambos pasan, reportá: "✓ Tipos OK · Build OK" con los tamaños del bundle.  
Si alguno falla, mostrá el error exacto y sugerí el fix.
