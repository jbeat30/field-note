import { userInfo } from 'node:os';
import { parseArgs } from 'node:util';

import { z } from 'zod';

import { createPrismaClient } from '../src/db/client';
import {
  buildInvitationLink,
  createCompanyWithInvitation,
  InvitationReissueError,
  listCompanies,
  reissueInvitation,
} from '../src/operator/operatorService';

const USAGE = `운영자 CLI (회사 업무 데이터는 조회하지 않음)

사용법
  pnpm operator create-company --company "회사 이름" --admin "관리자 이름" [--days 7]
  pnpm operator reissue --company-id <회사 ID> [--days 7]
  pnpm operator list`;

// 운영자 접속 정보는 api 서버 설정과 분리 (운영자 PC에만 둠)
const envSchema = z.object({
  DATABASE_OPERATOR_URL: z.url(),
  APP_ORIGIN: z.url(),
});

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
  if (error instanceof InvitationReissueError) {
    console.error(`재발급할 수 없음: ${error.message}`);
  } else {
    console.error(error instanceof Error ? error.message : error);
  }

  process.exitCode = 1;
});
