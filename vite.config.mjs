import { defineConfig } from "vite"
import { resolve } from "node:path"

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Chromium extension pages reject Vite's crossorigin modulepreload links
    // for extension-local chunks. The import itself still loads normally.
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: resolve(process.cwd(), "popup.html"),
        background: resolve(process.cwd(), "src/Background.res.mjs")
      },
      output: {
        entryFileNames: chunk => chunk.name === "background" ? "background.js" : "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
})
