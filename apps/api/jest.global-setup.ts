import { SHARED_URL_ENV, startSharedPostgres } from './src/db/sharedTestDatabase';

declare global {
  var __FIELD_NOTE_PG__: Awaited<ReturnType<typeof startSharedPostgres>>['container'] | undefined;
}

// 테스트 워커의 환경 변수 상속 (공유 컨테이너에서 워커별 DB 생성)
export default async () => {
  const { container, adminUrl } = await startSharedPostgres();

  globalThis.__FIELD_NOTE_PG__ = container;
  process.env[SHARED_URL_ENV] = adminUrl;
};
