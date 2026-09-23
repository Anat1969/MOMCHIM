import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works under any path (e.g. GitHub Pages /MOMCHIM/)
  base: './',
  logLevel: 'error', // Suppress warnings, only show errors
  // Shown on the settings screen, so a stale cached build is easy to spot.
  define: {
    __BUILD_ID__: JSON.stringify(
      new Date().toISOString().slice(0, 16).replace('T', ' ')
    ),
  },
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(here, 'src') },
  },
});
