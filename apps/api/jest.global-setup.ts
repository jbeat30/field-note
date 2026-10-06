import { SHARED_URL_ENV, startSharedPostgres } from './src/db/sharedTestDatabase';

declare global {
  var __FIELD_NOTE_PG__: Awaited<ReturnType<typeof startSharedPostgres>>['container'] | undefined;
}

// 테스트 워커는 이 환경 변수를 물려받아 공유 컨테이너에서 자기 DB를 만든다
export default async () => {
  const { container, adminUrl } = await startSharedPostgres();

  globalThis.__FIELD_NOTE_PG__ = container;
  process.env[SHARED_URL_ENV] = adminUrl;
};
