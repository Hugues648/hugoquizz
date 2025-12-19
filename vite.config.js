import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // Permet l'accès depuis d'autres appareils sur le réseau (téléphones, tablettes)
    host: true,
    // Permet le fallback vers index.html pour les routes SPA
    historyApiFallback: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  // Assure que toutes les routes redirigent vers index.html
  appType: 'spa'
})
