import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pluginNotas from './vite/plugin-notas'

// https://vite.dev/config/
// En producción (build para GitHub Pages) la app se sirve bajo /weekly-planner/.
// En dev se sirve en la raíz para no ensuciar las URLs locales.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/weekly-planner/' : '/',
  plugins: [react(), tailwindcss(), pluginNotas()],
}))
