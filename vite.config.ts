import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// `base: './'` keeps every asset URL relative, so the bundle works from
// https://<user>.github.io/<repo-name>/ regardless of the repository name.
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Pulse Music Player',
        short_name: 'Pulse',
        description: 'Offline-first music player for your own MP3, M4A and WAV files.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d0b18',
        theme_color: '#0d0b18',
        start_url: './',
        scope: './',
        categories: ['music', 'entertainment'],
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole app shell so it opens instantly in Airplane Mode.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
})

