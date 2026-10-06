import { env } from '../env';

/**
 * @description 목업 모드(`pnpm dev:mock`)에서만 브라우저 가짜 서버를 켠다 (운영 번들에는 실행 경로가 남지 않음)
 */
export const enableMocking = async () => {
  if (!env.isMockApi) {
    return;
  }

  const { setupWorker } = await import('msw/browser');
  const { handlers } = await import('./handlers');

  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass', quiet: true });
};
