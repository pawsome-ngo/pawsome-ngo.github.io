import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'Pawsome NGO Chat',
        short_name: 'Pawsome',
        description: 'Chat application for Pawsome NGO',
        theme_color: '#fc5c7d',
        background_color: '#fc5c7d',

        // --- ✨ ADD THESE TWO LINES ---
        start_url: '/',
        display: 'standalone',
        // --- End of Add ---

        icons: [
          {
            // --- ✨ FIX: Correct file path ---
            src: 'pawsome_app_icon.png', // Was 'pwa-192x192.png'
            sizes: '192x192',
            type: 'image/png'
          },
          {
            // --- ✨ FIX: Correct file path ---
            src: 'android-chrome-512x512.png', // Was 'pwa-512x512.png'
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173,
  },
  define: {
    global: 'window',
  },
})