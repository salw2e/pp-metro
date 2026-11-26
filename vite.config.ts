import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/metro/',
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 1500 },
  worker: { format: 'es' },
})
