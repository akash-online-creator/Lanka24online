import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// සටහන: සිංහල භාෂාවේ යංශය (්‍ය), රකාරාංශය (්‍ර) සහ බැඳි අකුරු ආරක්ෂා කරගැනීම සඳහා
// පැරණි cleanUnicodePlugin සම්පූර්ණයෙන්ම ඉවත් කර ඇත.

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
