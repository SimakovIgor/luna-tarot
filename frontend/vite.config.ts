import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Mini App едет в Spring static under /app/, поэтому базовый путь — "/app/" в проде.
// В dev — корень, чтобы fetch'и шли через прокси на бэкенд (8090).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/app/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    // Поднимаем порог предупреждения после кода-сплита (главный chunk
    // ужался ниже 250 KB, vendor-чанки кэшируются между деплоями).
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Разнесём большие зависимости по отдельным chunks. Это даёт:
        //  - параллельную загрузку (HTTP/2);
        //  - долгий браузерный кэш на vendor (он меняется редко);
        //  - меньший initial bundle (быстрее first paint в Telegram WebView).
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('@sentry')) return 'vendor-sentry';
          if (id.includes('posthog-js')) return 'vendor-posthog';
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
    },
  },
}));
