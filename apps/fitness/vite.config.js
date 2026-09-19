import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Served under the same GitHub Pages site as the other Summit apps.
  base: '/summit-app/fitness/',
  // One shared env file for all three apps (apps/.env.local) instead of one each.
  envDir: '..',
})
