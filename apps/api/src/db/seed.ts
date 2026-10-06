import { createHash } from 'node:crypto';

import { DEMO_ACCOUNTS, DEMO_LEGAL_DOCUMENTS } from '@field-note/shared/demo';

import { hashPassword } from '../auth/password';

import type { PrismaClient } from './client';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

export type SeedResult = { companies: number; users: number; documents: number };

/**
 * @description 로컬 개발용 더미 데이터 입력 (여러 번 실행해도 같은 결과, 소유 계정 클라이언트 전용)
 * 회사·계정·약관 버전·동의 이력을 만든다. 회사 설정과 초대는 해당 테이블이 생기는 P0-2·P0-8에서 추가
 * @param prisma 소유 계정(DATABASE_MIGRATE_URL) Prisma 클라이언트
 * @returns 입력한 개수
 */
export const seedDemoData = async (prisma: PrismaClient): Promise<SeedResult> => {
  const documents = await Promise.all(
    DEMO_LEGAL_DOCUMENTS.map((document) =>
      prisma.legalDocument.upsert({
        where: { type_version: { type: document.type, version: document.version } },
        update: {},
        create: {
          id: document.id,
          type: document.type,
          version: document.version,
          effectiveAt: new Date(document.effectiveAt),
          contentHash: sha256(document.draftText),
          isRequired: document.isRequired,
        },
      }),
    ),
  );

  for (const account of DEMO_ACCOUNTS) {
    const now = new Date();

    await prisma.company.upsert({
      where: { id: account.companyId },
      update: { name: account.companyName },
      create: { id: account.companyId, name: account.companyName },
    });

    // 이메일 인증이 끝난 계정만 활성, 인증 전은 초대 상태로 유지
    await prisma.user.upsert({
      where: { companyId_id: { companyId: account.companyId, id: account.userId } },
      update: { displayName: account.displayName },
      create: {
        id: account.userId,
        companyId: account.companyId,
        displayName: account.displayName,
        email: account.email,
        emailVerifiedAt: account.isEmailVerified ? now : null,
        ageConfirmedAt: now,
        status: account.isEmailVerified ? 'ACTIVE' : 'INVITED',
      },
    });

    // 비밀번호 해시는 처음 한 번만 만들어 다시 실행해도 바뀌지 않게 함
    await prisma.userCredential.upsert({
      where: { companyId_userId: { companyId: account.companyId, userId: account.userId } },
      update: {},
      create: {
        companyId: account.companyId,
        userId: account.userId,
        loginId: account.loginId,
        passwordHash: await hashPassword(account.password),
      },
    });

    // 필수 약관과 만 14세 확인에 동의한 이력 (선택인 마케팅은 동의하지 않음)
    for (const document of documents.filter((item) => item.isRequired)) {
      const exists = await prisma.consent.count({
        where: { companyId: account.companyId, userId: account.userId, documentId: document.id },
      });

      if (exists === 0) {
        await prisma.consent.create({
          data: {
            companyId: account.companyId,
            userId: account.userId,
            documentId: document.id,
            isAgreed: true,
          },
        });
      }
    }
  }

  return {
    companies: DEMO_ACCOUNTS.length,
    users: DEMO_ACCOUNTS.length,
    documents: documents.length,
  };
};
