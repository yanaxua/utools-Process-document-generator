import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        // Keep preload.js at the root of dist
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'preload' ? '[name].js' : 'assets/[name]-[hash].js'
        }
      }
    },
  },
})
