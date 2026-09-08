import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('pdf-lib') || id.includes('@pdf-lib') || id.includes('@pdfsmaller')) {
                return 'vendor-pdflib';
              }
              if (id.includes('xlsx') || id.includes('docx') || id.includes('mammoth') || id.includes('jszip')) {
                return 'vendor-office';
              }
              if (id.includes('tesseract.js')) {
                return 'vendor-ocr';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('react-helmet-async')) {
                return 'vendor-core';
              }
            }
          },
        },
      },
    },
  };
});
