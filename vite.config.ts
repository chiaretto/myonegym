import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://chiaretto.github.io/myonegym/ in production; root in dev.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/myonegym/' : '/',
  // Expose the dev server on the LAN so the PWA can be opened from a phone.
  // Fixed port keeps the Windows portproxy → WSL forwarding rule valid.
  server: { host: true, port: 5173, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'MyOneGym',
        short_name: 'MyOneGym',
        description: 'Offline workout tracker — gyms, days, exercises and per-gym target weights.',
        lang: 'pt-BR',
        theme_color: '#B8524E',
        background_color: '#FAF6F5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
}))
