import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://<user>.github.io/plug-and-park/ — hence the base path.
export default defineConfig({
  base: '/plug-and-park/',
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
})
