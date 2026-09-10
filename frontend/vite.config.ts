import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    proxy: {
      '/api': {
        // Overridable via frontend/.env → VITE_API_TARGET (see .env.example).
        target: process.env.VITE_API_TARGET ?? 'http://localhost:5053',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
