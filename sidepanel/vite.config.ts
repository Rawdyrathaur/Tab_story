import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
const projectRoot = path.resolve(__dirname, '..');

export default defineConfig({
  root: path.resolve(__dirname), // Set root to sidepanel directory
  plugins: [
    react(),
  ],
  base: './', // Use relative paths for Chrome extension
  build: {
    outDir: path.join(projectRoot, 'dist'), // Output dist folder in project root
    emptyOutDir: true, // Ensure the dist folder is cleared before each build
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
});
