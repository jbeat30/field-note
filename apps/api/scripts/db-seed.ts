import { createPrismaClient } from '../src/db/client';
import { seedDemoData } from '../src/db/seed';

// 더미 계정과 공개된 데모 비밀번호가 들어가므로 운영 DB에는 절대 실행하지 않음
if (process.env.NODE_ENV === 'production') {
  throw new Error('[db-seed] 운영 환경에서는 실행할 수 없음');
}

const migrateUrl = process.env.DATABASE_MIGRATE_URL;

if (!migrateUrl) {
  throw new Error('[db-seed] DATABASE_MIGRATE_URL 필요');
}

const prisma = createPrismaClient(migrateUrl);

try {
  const result = await seedDemoData(prisma);

  console.log(
    `[db-seed] 완료 회사=${result.companies} 계정=${result.users} 약관=${result.documents} 직원=${result.employees} 명부=${result.partners} 프로젝트=${result.projects} 투입=${result.assignments}`,
  );
} finally {
  await prisma.$disconnect();
}
