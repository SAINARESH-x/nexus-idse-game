/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Vite + Vitest config. Base path is overridable for GitHub Pages builds.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split vendor code, the pure engine and each level into their own chunks (no chunk over 800 kB).
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
          const level = /src\/levels\/(l0\d)\//.exec(id)
          if (level) return `level-${level[1]}`
          if (id.includes('/src/engine/')) return 'engine'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Integration suites drive many UI steps; allow headroom on slower or busy machines.
    testTimeout: 20000,
  },
})
