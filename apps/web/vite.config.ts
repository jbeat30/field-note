import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const require = createRequire(import.meta.url);

// 목업 모드 전용: msw 서비스 워커 파일을 패키지에서 바로 제공 (public에 복사하지 않아 운영 빌드에 섞이지 않음)
const serveMockWorker = (): Plugin => ({
  name: 'serve-mock-worker',
  configureServer: (server) => {
    server.middlewares.use('/mockServiceWorker.js', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(readFileSync(require.resolve('msw/mockServiceWorker.js')));
    });
  },
});

// 루트 .env의 APP_ORIGIN에서 개발 서버 포트를 읽음 (api의 CSRF 허용 주소와 같은 값, 없으면 5173)
const devPort = (mode: string) => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const origin = loadEnv(mode, root, 'APP_ORIGIN').APP_ORIGIN ?? 'http://localhost:5173';

  return Number(new URL(origin).port) || 5173;
};

export default defineConfig(({ mode }) => ({
  plugins: [
    ...(mode === 'mock' ? [serveMockWorker()] : []),
    tailwindcss(),
    react(),
    // 앱 껍데기만 캐시, 업무 데이터(/api)는 오프라인 읽기·쓰기를 지원하지 않으므로 캐시 제외
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
        theme_color: '#005ce6',
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
    port: devPort(mode),
    // 운영과 같은 도메인 구성을 맞추기 위해 /api를 api 서버로 전달
    // 3000번 포트를 다른 프로그램이 사용 중이면 api를 다른 포트로 실행하고 `API_PROXY_TARGET=http://localhost:3001`로 지정
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000' },
  },
}));
