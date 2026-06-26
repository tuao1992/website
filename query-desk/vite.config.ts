import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      includeAssets: ['icons/favicon-32.png'],
      manifest: {
        name: 'Weldrite Query Desk',
        short_name: 'Query Desk',
        description: 'Internal Q&A tool for Weldrite staff',
        theme_color: '#1F3864',
        background_color: '#1F3864',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Firestore manages its own offline cache (persistentLocalCache) via IndexedDB.
        // Letting the service worker also intercept Firestore's streaming/long-polling
        // RPCs can break that transport, so we deliberately don't add runtimeCaching
        // entries for firestore.googleapis.com / googleapis.com here.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
