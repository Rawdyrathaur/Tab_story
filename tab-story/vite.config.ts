import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webExtension from 'vite-plugin-web-extension'

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    webExtension({
      manifest: './manifest.json',
      additionalInputs: ["src/notes/index.html"],
    }),
  ],
})