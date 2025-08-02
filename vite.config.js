import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This makes Vite bind to all network interfaces
    port: 5173, // Your frontend port
    // You can optionally specify a strict port if you want Vite to fail if the port is already in use
    // strictPort: true,
  },
  define: { // ADD THIS BLOCK
    global: 'window', // Define 'global' as 'window' for SockJS compatibility
  },
})
