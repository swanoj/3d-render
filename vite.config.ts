import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'

// https://reactrouter.com/start/framework/installation
export default defineConfig({
  plugins: [reactRouter()],
  ssr: {
    // Bundle GSAP into the server build. Its plugins are ES modules in a package without "type": "module", and on
    // Vercel Functions importing gsap/ScrollTrigger from node_modules failed ("does not provide an export named
    // 'ScrollTrigger'"), which took every page down.
    // @sanity/image-url is bundled for the same reason: nothing left to resolve from node_modules on Vercel.
    noExternal: ['gsap', '@gsap/react', '@sanity/image-url'],
  },
  build: {
    // three.js and React Three Fiber make up the 3D chunk, which only loads after the page has rendered.
    chunkSizeWarningLimit: 1300,
  },
})
