import { userInfo } from 'node:os';
import { parseArgs } from 'node:util';

import { z } from 'zod';

import { createPrismaClient } from '../src/db/client';
import { listDueClosures, purgeDueCompanies } from '../src/closure/purgeService';
import { registerLegalDocuments, LegalContentChangedError } from '../src/legal/legalDocuments';
import {
  DemoLegalMissingError,
  DemoResetBusyError,
  removePublicDemo,
  resetPublicDemo,
  withDemoResetLock,
} from '../src/demo/publicDemoReset';
import { deleteCompany, DeleteCompanyError } from '../src/operator/deleteCompany';
import { createS3Storage, type ObjectStorage } from '../src/storage/objectStorage';
import {
  buildInvitationLink,
  createCompanyWithInvitation,
  InvitationReissueError,
  TakeoverIssueError,
  issueTakeoverInvitation,
  listCompanies,
  reissueInvitation,
} from '../src/operator/operatorService';

const USAGE = `운영자 CLI (회사 업무 데이터는 조회하지 않음)

사용법
  pnpm operator create-company --company "회사 이름" --admin "관리자 이름" [--days 7]
  pnpm operator reissue --company-id <회사 ID> [--days 7]
  pnpm operator recover --company-id <회사 ID> --note "본인 확인 방법" [--days 3]
  pnpm operator transfer --company-id <회사 ID> --new-name "새 소유자 이름" --note "본인 확인 방법" [--days 3]
  pnpm operator list
  pnpm operator legal-register
  pnpm operator closures                       # 해지 요청 목록 (삭제 전용 계정 필요)
  pnpm operator purge-due [--dry-run]          # 유예가 끝난 회사의 데이터 삭제·익명화 (삭제 전용 계정 필요)
  pnpm operator demo-reset                     # 공개 시연 회사(Test Company)를 처음 상태로 되돌림 (PUBLIC_DEMO_ENABLED=true, 소유 계정 필요, 약관 등록 뒤)
  pnpm operator demo-remove                    # 공개 시연 회사의 데이터·파일·로그인을 없앰 (시연 환경을 끌 때, 소유 계정 필요)
  pnpm operator delete-company --company-id <회사 ID> --confirm-name "회사 이름" [--dry-run]
                                               # 해지 유예 없이 회사를 완전 삭제 (시험 계정 정리용, 되돌릴 수 없음, 소유 계정 필요)`;

const LEGAL_USAGE_NOTE =
  '약관·처리방침 문서를 DB에 등록 (이미 등록된 같은 버전은 건너뛰고, 내용이 달라졌는데 버전이 같으면 거부)';

// 운영자 접속 정보는 api 서버 설정과 분리 (운영자 PC에만 둠)
const envSchema = z.object({
  DATABASE_OPERATOR_URL: z.url(),
  // 해지 삭제 명령에만 필요
  DATABASE_PURGE_URL: z.url().optional(),
  // 시연 회사 초기화에만 필요: 소유 계정과 업로드 파일을 지울 객체 저장소
  DATABASE_MIGRATE_URL: z.url().optional(),
  // 시연 회사를 만드는 초기화가 켜진 환경에서만 실행되도록 막는 스위치 (서비스 단계에서 끄면 새벽 크론이 시연 회사를 되살리지 않음)
  PUBLIC_DEMO_ENABLED: z.stringbool().default(false),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY: z.string().min(1).optional(),
  S3_SECRET_KEY: z.string().min(1).optional(),
  APP_ORIGIN: z.url(),
});

// 설정이 모두 있을 때만 객체 저장소에 연결
const createStorageFromEnv = (env: z.infer<typeof envSchema>): ObjectStorage | undefined => {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY } = env;

  return S3_ENDPOINT && S3_REGION && S3_BUCKET && S3_ACCESS_KEY && S3_SECRET_KEY
    ? createS3Storage({
        endpoint: S3_ENDPOINT,
        region: S3_REGION,
        bucket: S3_BUCKET,
        accessKey: S3_ACCESS_KEY,
        secretKey: S3_SECRET_KEY,
      }).storage
    : undefined;
};

const printInvitation = (
  appOrigin: string,
  invitation: { token: string; expiresAt: Date; companyId: string },
) => {
  console.log(`회사 ID   ${invitation.companyId}`);
  console.log(`초대 링크 ${buildInvitationLink(appOrigin, invitation.token)}`);
  console.log(`만료      ${invitation.expiresAt.toLocaleString('ko-KR')}`);
  console.log(
    '※ 링크는 지금 한 번만 표시됩니다. 분실하면 `reissue`로 다시 발급하세요 (기존 링크는 즉시 만료)',
  );
};

const main = async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      company: { type: 'string' },
      admin: { type: 'string' },
      'company-id': { type: 'string' },
      note: { type: 'string' },
      'new-name': { type: 'string' },
      'confirm-name': { type: 'string' },
      'dry-run': { type: 'boolean' },
      days: { type: 'string' },
    },
  });
  const [command] = positionals;
  const days = values.days === undefined ? undefined : Number(values.days);

  if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 30)) {
    throw new Error('--days는 1~30 사이 정수');
  }

  const env = envSchema.parse(process.env);
  const prisma = createPrismaClient(env.DATABASE_OPERATOR_URL);
  const operator = userInfo().username;

  try {
    if (command === 'create-company') {
      if (!values.company?.trim() || !values.admin?.trim()) {
        throw new Error('--company와 --admin 필요');
      }

      const invitation = await createCompanyWithInvitation(prisma, {
        companyName: values.company.trim(),
        adminName: values.admin.trim(),
        days,
        operator,
      });

      console.log(`회사 생성 완료: ${values.company.trim()}`);
      printInvitation(env.APP_ORIGIN, invitation);
    } else if (command === 'reissue') {
      if (!values['company-id']) {
        throw new Error('--company-id 필요');
      }

      printInvitation(
        env.APP_ORIGIN,
        await reissueInvitation(prisma, { companyId: values['company-id'], days, operator }),
      );
    } else if (command === 'recover' || command === 'transfer') {
      if (!values['company-id']) {
        throw new Error('--company-id 필요');
      }

      if (!values.note?.trim()) {
        throw new Error('--note 필요 (본인 확인 방법, 이름·연락처 같은 개인정보는 적지 않음)');
      }

      if (command === 'transfer' && !values['new-name']?.trim()) {
        throw new Error('--new-name 필요 (새 소유자 이름)');
      }

      printInvitation(
        env.APP_ORIGIN,
        await issueTakeoverInvitation(prisma, {
          companyId: values['company-id'],
          kind: command === 'recover' ? 'RECOVERY' : 'TRANSFER',
          note: values.note,
          newDisplayName: values['new-name'],
          days,
          operator,
        }),
      );
      console.log(
        '※ 링크를 쓰는 순간 기존 로그인(세션·소셜 연동·아이디·비밀번호)이 모두 해제되고 새 아이디·비밀번호·이메일을 등록합니다. 사용 전까지 기존 로그인은 유지됩니다',
      );
    } else if (command === 'legal-register') {
      console.log(LEGAL_USAGE_NOTE);
      console.table(await registerLegalDocuments(prisma));
    } else if (command === 'closures' || command === 'purge-due') {
      if (!env.DATABASE_PURGE_URL) {
        throw new Error('DATABASE_PURGE_URL 필요 (삭제 전용 계정)');
      }

      const purgePrisma = createPrismaClient(env.DATABASE_PURGE_URL);

      try {
        if (command === 'closures' || values['dry-run']) {
          console.log(
            values['dry-run']
              ? '삭제 대상 (실제 삭제는 하지 않음)'
              : '유예가 끝나 삭제할 수 있는 해지 요청',
          );
          console.table(await listDueClosures(purgePrisma));
        } else {
          const summary = await purgeDueCompanies(purgePrisma);

          console.log(`삭제 완료 ${summary.purged.length}건, 실패 ${summary.failed.length}건`);

          if (summary.purged.length)
            console.table(
              summary.purged.map((item) => ({
                companyId: item.companyId,
                ...item.deleted,
                익명화한계정: item.anonymizedUsers,
              })),
            );
          if (summary.failed.length) {
            console.table(summary.failed);
            process.exitCode = 1;
          }
        }
      } finally {
        await purgePrisma.$disconnect();
      }
    } else if (command === 'delete-company') {
      if (!env.DATABASE_MIGRATE_URL) {
        throw new Error('DATABASE_MIGRATE_URL 필요 (소유 계정)');
      }

      if (!values['company-id'] || !values['confirm-name']) {
        throw new Error('--company-id와 --confirm-name 필요 (회사 이름을 그대로 입력)');
      }

      const dryRun = values['dry-run'] ?? false;
      const storage = createStorageFromEnv(env);

      if (!storage) {
        console.warn('※ 객체 저장소 설정이 없어 회사가 올린 파일은 지우지 않습니다');
      }

      const ownerPrisma = createPrismaClient(env.DATABASE_MIGRATE_URL);

      try {
        const result = await deleteCompany(ownerPrisma, {
          companyId: values['company-id'],
          confirmName: values['confirm-name'],
          dryRun,
          storage,
        });

        console.log(
          dryRun
            ? '삭제 미리보기 (실제로는 지우지 않음): 아래 행이 지워집니다'
            : `회사 삭제 완료: 업로드 파일 ${result.removedObjects}개 삭제`,
        );
        console.table(result.deleted);

        if (!dryRun) {
          // 회사 행이 사라져 운영자 작업 기록에 남길 수 없으므로 실행 기록을 출력
          console.log(
            `[기록] ${new Date().toISOString()} delete-company 운영자=${operator} 회사ID=${values['company-id']} 이름=${result.companyName}`,
          );
        }
      } finally {
        await ownerPrisma.$disconnect();
      }
    } else if (command === 'demo-reset' || command === 'demo-remove') {
      if (!env.DATABASE_MIGRATE_URL) {
        throw new Error('DATABASE_MIGRATE_URL 필요 (소유 계정)');
      }

      if (command === 'demo-reset' && !env.PUBLIC_DEMO_ENABLED) {
        throw new Error('PUBLIC_DEMO_ENABLED=true일 때만 시연 회사를 만들 수 있음');
      }

      const storage = createStorageFromEnv(env);

      if (!storage) {
        console.warn('※ 객체 저장소 설정이 없어 시연 회사가 올린 파일은 지우지 않습니다');
      }

      const ownerPrisma = createPrismaClient(env.DATABASE_MIGRATE_URL);

      try {
        const result = await withDemoResetLock(env.DATABASE_MIGRATE_URL, () =>
          command === 'demo-reset'
            ? resetPublicDemo(ownerPrisma, storage)
            : removePublicDemo(ownerPrisma, storage),
        );

        console.log(
          `시연 회사 ${command === 'demo-reset' ? '초기화' : '제거'} 완료: 업로드 파일 ${result.removedObjects}개 삭제`,
        );
        console.table(result.deleted);

        if ('seeded' in result) console.table(result.seeded);
      } finally {
        await ownerPrisma.$disconnect();
      }
    } else if (command === 'list') {
      console.table(await listCompanies(prisma));
    } else {
      console.log(USAGE);
    }
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error: unknown) => {
  if (error instanceof LegalContentChangedError) {
    console.error(error.message);
  } else if (error instanceof DemoResetBusyError || error instanceof DemoLegalMissingError) {
    console.error(error.message);
  } else if (error instanceof DeleteCompanyError) {
    console.error(`삭제할 수 없음: ${error.message}`);
  } else if (error instanceof InvitationReissueError) {
    console.error(`재발급할 수 없음: ${error.message}`);
  } else if (error instanceof TakeoverIssueError) {
    console.error(`발급할 수 없음: ${error.message}`);
  } else {
    console.error(error instanceof Error ? error.message : error);
  }

  process.exitCode = 1;
});
