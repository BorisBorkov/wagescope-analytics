import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: true },
  build: {
    rollupOptions: {
      output: {
        // Libraries in their own cacheable chunk; Recharts alone is ~550 kB minified.
        manualChunks: { vendor: ['react', 'react-dom', 'recharts'] },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
