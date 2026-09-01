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
