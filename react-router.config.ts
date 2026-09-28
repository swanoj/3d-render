import type { Config } from '@react-router/dev/config'
import { vercelPreset } from '@vercel/react-router/vite'

export default {
  // Server-render every page, like Shopify Hydrogen (which is built on React Router).
  ssr: true,
  // On Vercel the preset splits the server build into Vercel Functions; locally `npm start` serves a single bundle.
  presets: process.env.VERCEL ? [vercelPreset()] : [],
} satisfies Config
