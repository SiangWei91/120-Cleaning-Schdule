import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this at https://<user>.github.io/120-Cleaning-Schdule/,
// so built asset paths need that prefix. Local dev runs from the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/120-Cleaning-Schdule/' : '/',
  plugins: [react()],
}))
