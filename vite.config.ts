import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/NEXT-WALKINS/',
  build: { outDir: 'dist', sourcemap: true },
});
