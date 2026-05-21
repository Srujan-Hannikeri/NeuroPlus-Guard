import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This allows your phone to load the website!
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // This routes your phone's login to your PC's backend!
        changeOrigin: true,
      },
    },
  },
})
