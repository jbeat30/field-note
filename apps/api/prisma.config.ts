import { defineConfig } from 'prisma/config';

// 마이그레이션은 테이블 소유 계정으로 실행 (앱 계정은 DATABASE_URL, 런타임 전용)
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_MIGRATE_URL ?? '' },
});
