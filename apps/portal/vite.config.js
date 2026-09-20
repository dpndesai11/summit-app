import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The portal is the site root; the apps it links to live in subfolders.
  base: '/summit-app/',
  // One shared env file for all the apps (apps/.env.local) instead of one each.
  envDir: '..',
})
