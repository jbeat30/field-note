import { randomUUID } from 'node:crypto';

import pg from 'pg';

import { createPrismaClient, type PrismaClient } from './client';
import { withDatabase } from './connectionUrl';
import { ROLE_PASSWORDS, SHARED_URL_ENV, TEMPLATE_DB } from './sharedTestDatabase';

export type TestDatabase = {
  // 소유 계정 (테스트 데이터 준비·스키마 점검용)
  owner: PrismaClient;
  ownerPool: pg.Pool;
  // 앱 계정 (실제 서비스와 같은 권한)
  app: PrismaClient;
  // 회사 범위 밖 전용 계정 (세션만 접근 가능)
  auth: PrismaClient;
  // 운영자 계정 (회사·계정·초대 발급과 작업 기록만 가능)
  operator: PrismaClient;
  // 삭제 전용 계정 (해지 유예가 끝난 회사의 데이터 삭제·익명화만 가능)
  purge: PrismaClient;
  // 작업 큐(pg-boss) 전용 계정 접속 주소 (큐 스키마만 접근)
  queueUrl: string;
  ownerUrl: string;
  stop: () => Promise<void>;
};

const CLONE_LOCK_ID = 7_310_001;

/**
 * @description 공유 PostgreSQL 컨테이너에 마이그레이션이 끝난 템플릿 DB를 복제해 스위트 전용 DB를 만들고 계정별 클라이언트 반환
 * 컨테이너는 jest 전역 설정(`jest.global-setup.ts`)이 한 번만 띄운다
 * @returns 테스트 DB 핸들
 */
export const startTestDatabase = async (): Promise<TestDatabase> => {
  const adminUrl = process.env[SHARED_URL_ENV];

  if (!adminUrl) {
    throw new Error(
      '[testDatabase] 공유 DB가 없음 (jest 전역 설정이 실행되지 않음, `pnpm test`로 실행)',
    );
  }

  const databaseName = `t_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Pool({ connectionString: adminUrl });

  // 같은 템플릿을 동시에 복제하면 "source database is being accessed" 오류가 날 수 있어 서버 전체에서 한 번에 하나씩 복제
  const cloner = await admin.connect();

  try {
    await cloner.query('SELECT pg_advisory_lock($1)', [CLONE_LOCK_ID]);
    await cloner.query(`CREATE DATABASE ${databaseName} TEMPLATE ${TEMPLATE_DB}`);
  } finally {
    await cloner.query('SELECT pg_advisory_unlock($1)', [CLONE_LOCK_ID]).catch(() => undefined);
    cloner.release();
  }

  // 데이터베이스 단위 권한은 템플릿 복제에 포함되지 않으므로 마이그레이션이 준 권한을 다시 부여 (작업 큐 계정의 스키마 생성)
  await admin.query(`GRANT CREATE ON DATABASE ${databaseName} TO field_note_queue`);

  const ownerUrl = withDatabase(adminUrl, databaseName);
  const ownerPool = new pg.Pool({ connectionString: ownerUrl });
  const roleUrl = (role: keyof typeof ROLE_PASSWORDS) => {
    const url = new URL(ownerUrl);

    url.username = role;
    url.password = ROLE_PASSWORDS[role];

    return url.toString();
  };

  const owner = createPrismaClient(ownerUrl);
  const app = createPrismaClient(roleUrl('field_note_app'));
  const auth = createPrismaClient(roleUrl('field_note_auth'));
  const operator = createPrismaClient(roleUrl('field_note_operator'));
  const purge = createPrismaClient(roleUrl('field_note_purge'));

  return {
    owner,
    ownerPool,
    app,
    auth,
    operator,
    purge,
    queueUrl: roleUrl('field_note_queue'),
    ownerUrl,
    stop: async () => {
      await Promise.all([
        app.$disconnect(),
        auth.$disconnect(),
        operator.$disconnect(),
        purge.$disconnect(),
        owner.$disconnect(),
      ]);
      await ownerPool.end();
      // DB는 지우지 않음: 컨테이너가 전체 실행이 끝날 때 통째로 사라지고, 닫히는 중인 연결을 강제로 끊으면 연결 오류가 처리되지 않은 채 올라옴
      await admin.end();
    },
  };
};
