import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Compressed initial and lazy-loaded assets are enforced by check-bundle-size.mjs.
    chunkSizeWarningLimit: 700,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
})
