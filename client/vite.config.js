import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // long-lived vendor chunks: app updates don't force users to re-download React / Motion
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['motion', 'motion/react'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
