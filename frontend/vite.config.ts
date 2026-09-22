import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const PROXY = {
  '/api': 'http://127.0.0.1:8000',
  '/health': 'http://127.0.0.1:8000',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    allowedHosts: true,
    proxy: PROXY,
  },
  // The same proxy for `vite preview`, which does not inherit `server.proxy`.
  //
  // It has to be one origin in both, because the session cookie is SameSite=Lax:
  // a page on localhost:5173 calling 127.0.0.1:8000 is calling another site, and
  // the browser leaves the cookie behind, so nothing is ever signed in. Proxied,
  // the API is same-origin in development and CORS never comes into it -- which
  // is also how it is deployed.
  preview: {
    allowedHosts: true,
    proxy: PROXY,
  },
})