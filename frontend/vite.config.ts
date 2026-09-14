<<<<<<< HEAD
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  // node_modules is shared with the sibling prototypes, so packaged assets —
  // the font files — resolve outside this project, and Vite blocks those by
  // default. Without this the webfont 403s and everything falls back to the
  // system sans.
  server: { fs: { allow: [".."] } },
})
=======
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
  },
})
>>>>>>> 4eb84e5c8850ab27879eaab5e00ca663493ef244
