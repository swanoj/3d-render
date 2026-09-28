import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'

// https://reactrouter.com/start/framework/installation
export default defineConfig({
  plugins: [reactRouter()],
  build: {
    // three.js and React Three Fiber make up the 3D chunk, which only loads after the page has rendered.
    chunkSizeWarningLimit: 1300,
  },
})
