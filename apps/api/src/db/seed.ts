import { createHash } from 'node:crypto';

import { DEMO_ACCOUNTS, DEMO_INVITATION, DEMO_LEGAL_DOCUMENTS } from '@field-note/shared/demo';

import { hashPassword } from '../auth/password';
import { hashToken } from '../auth/token';

import type { PrismaClient } from './client';

export type SeedResult = {
  companies: number;
  users: number;
  documents: number;
  invitations: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// 문서 본문 해시 (운영자 등록 `registerLegalDocuments`와 같은 알고리즘, 같은 본문이면 같은 값)
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/**
 * @description 로컬 개발용 더미 데이터 입력 (여러 번 실행해도 같은 결과, 소유 계정 클라이언트 전용)
 * 회사·계정·약관 버전·동의 이력과, 가입 전 회사의 1회용 초대 링크(`demo-invite-0001`)를 만든다. 회사 설정(기준시간·월 기준일수·공수 방식)
 * @param prisma 소유 계정(DATABASE_MIGRATE_URL) Prisma 클라이언트
 * @returns 입력한 개수
 */
export const seedDemoData = async (prisma: PrismaClient): Promise<SeedResult> => {
  const documents = await Promise.all(
    DEMO_LEGAL_DOCUMENTS.map((document) =>
      prisma.legalDocument.upsert({
        where: { type_version: { type: document.type, version: document.version } },
        // 개발용 시드는 문서 원본이 바뀌면 같은 버전의 해시도 최신으로 맞춤 (운영 등록은 이를 거부함)
        update: { contentHash: sha256(document.draftText) },
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

    // 회사 설정 (처음 한 번만 만들고, 이후 화면에서 바꾼 값은 시드가 되돌리지 않음)
    await prisma.companySettings.upsert({
      where: { companyId: account.companyId },
      update: {},
      create: { companyId: account.companyId, ...account.settings },
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

  // 가입 전 회사: 운영자 CLI가 만드는 것과 같은 구조(초대 상태 관리자 + 해시만 저장된 초대 링크)
  await prisma.company.upsert({
    where: { id: DEMO_INVITATION.companyId },
    update: { name: DEMO_INVITATION.companyName },
    create: { id: DEMO_INVITATION.companyId, name: DEMO_INVITATION.companyName },
  });
  await prisma.user.upsert({
    where: { companyId_id: { companyId: DEMO_INVITATION.companyId, id: DEMO_INVITATION.userId } },
    update: {},
    create: {
      id: DEMO_INVITATION.userId,
      companyId: DEMO_INVITATION.companyId,
      displayName: DEMO_INVITATION.adminName,
      status: 'INVITED',
    },
  });

  // 다시 실행하면 만료일만 연장하고, 이미 사용한 링크는 되살리지 않음
  const expiresAt = new Date(Date.now() + DEMO_INVITATION.expiresInDays * DAY_MS);

  await prisma.invitation.upsert({
    where: { tokenHash: hashToken(DEMO_INVITATION.token) },
    update: { expiresAt },
    create: {
      tokenHash: hashToken(DEMO_INVITATION.token),
      companyId: DEMO_INVITATION.companyId,
      userId: DEMO_INVITATION.userId,
      expiresAt,
    },
  });

  return {
    companies: DEMO_ACCOUNTS.length + 1,
    users: DEMO_ACCOUNTS.length + 1,
    documents: documents.length,
    invitations: 1,
  };
};
