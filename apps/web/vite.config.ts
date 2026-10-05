import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    // 앱 껍데기만 캐시. 업무 데이터(/api)는 오프라인 읽기·쓰기를 지원하지 않으므로 캐시하지 않음
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '필드노트',
        short_name: '필드노트',
        description: '현장 팀 프로젝트 관리',
        lang: 'ko',
        display: 'standalone',
        start_url: '/',
        background_color: '#ffffff',
        theme_color: '#1d4ed8',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    // 운영과 같은 도메인 구성을 맞추기 위해 /api를 api 서버로 전달
    proxy: { '/api': 'http://localhost:3000' },
  },
});
