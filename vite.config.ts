import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  build: {
    // three.js грузится лениво отдельным чанком (~135 КБ gzip), предупреждение о размере ожидаемо
    chunkSizeWarningLimit: 600,
  },
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
