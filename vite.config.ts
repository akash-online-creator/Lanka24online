import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// නොපෙනෙන Unicode / RTL markers ඉවත් කරන pre-plugin එක
const cleanUnicodePlugin = () => ({
  name: 'clean-invisible-unicode',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (/\.[jt]sx?$/.test(id)) {
      return {
        code: code.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u200E\u200F]/g, ''),
        map: null,
      };
    }
  },
});

export default defineConfig({
  base: './',
  plugins: [cleanUnicodePlugin(), react(), tailwindcss(), viteSingleFile()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
