import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command }) => ({
  // GitHub Pages 项目站点部署在 /SmartEldercarePlatform/ 子路径下
  base: command === 'build' ? '/SmartEldercarePlatform/' : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: false,
  },
}))
