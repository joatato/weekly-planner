import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pluginNotas from './vite/plugin-notas'

// https://vite.dev/config/
// En producción (build para GitHub Pages) la app se sirve bajo /weekly-planner/.
// En dev se sirve en la raíz para no ensuciar las URLs locales.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/weekly-planner/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    pluginNotas(),
    VitePWA({
      // El manifest ya existe a mano en public/manifest.webmanifest, con
      // start_url y scope relativos a propósito (ver docs/PLAN-MOVIL.md).
      // Si el plugin generara el suyo, lo pisaría.
      manifest: false,
      // `prompt` y no `autoUpdate`: con autoUpdate el service worker nuevo se
      // activa y recarga la página solo, sin avisar. En un planificador eso
      // puede cortar a alguien a mitad de arrastrar un bloque. Y peor para lo
      // que motivó el cambio: no había forma de saber que había una versión
      // esperando, así que en el celular parecía que un cambio "no llegaba"
      // cuando en realidad ya estaba deployado. Ahora avisa y recarga cuando
      // la persona toca.
      registerType: 'prompt',
      workbox: {
        cleanupOutdatedCaches: true,
        // Shell de la app: no incluir nada de Firebase, que es dinámico y
        // autenticado (identitytoolkit.googleapis.com, firebaseapp.com).
        globPatterns: ['**/*.{js,css,html,png}'],
      },
      // Sin SW en dev: ensucia el HMR y cachea versiones viejas mientras
      // se desarrolla.
      devOptions: {
        enabled: false,
      },
    }),
  ],
}))
