import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://<user>.github.io/kondate-app/
export default defineConfig({
  plugins: [react()],
  base: '/kondate-app/',
})
