import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getConfig } from './config/loader.js'

const viteConfig = getConfig('vite');

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: viteConfig?.server?.proxy?.api?.target || 'http://localhost:3001',
        changeOrigin: viteConfig?.server?.proxy?.api?.changeOrigin !== false,
      },
    },
  },
})

