import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js and React Three Fiber are most of the bundle; warn when it grows past its starting size.
    chunkSizeWarningLimit: 1300,
  },
})
