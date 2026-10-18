import { defineConfig } from '@playwright/test';

// 화면 전체 흐름 시험: 실제 서버·DB·저장소와 Chromium(모바일 크기)으로 핵심 흐름 확인
// 시험 전에 인프라와 DB가 준비되어 있어야 한다: pnpm infra:up && pnpm db:setup && pnpm db:seed (루트 README 참고)
// 사용자의 다른 앱이 3000번 포트를 쓰는 경우가 잦아 시험용 API는 3001번 사용
const API_PORT = Number(process.env.E2E_API_PORT ?? 3001);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5173);
const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  // 한 사용자가 쓰는 흐름이라 순서대로 한 개씩 (같은 회사 데이터를 쓰므로 병렬로 돌리지 않음)
  fullyParallel: false,
  workers: 1,
  retries: isCi ? 1 : 0,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  reporter: isCi ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    // 휴대폰 한 손 사용 기준 화면
    viewport: { width: 390, height: 844 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npx tsx --env-file-if-exists=../../.env src/main.ts',
      cwd: '../api',
      // 시험은 짧은 시간에 화면을 많이 열므로 호출 횟수 제한 한도를 늘림 (운영에서는 올릴 수 없는 설정)
      env: {
        PORT: String(API_PORT),
        APP_ORIGIN: `http://localhost:${WEB_PORT}`,
        RATE_LIMIT_MULTIPLIER: '10',
      },
      url: `http://localhost:${API_PORT}/api/v1/health`,
      reuseExistingServer: !isCi,
      timeout: 120_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !isCi,
      timeout: 120_000,
    },
  ],
});
