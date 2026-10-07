import { createHash } from 'node:crypto';

import {
  OPTION_KINDS,
  OPTION_PRESETS,
  normalizeOptionName,
  normalizePartnerName,
} from '@field-note/shared';
import {
  DEMO_ACCOUNTS,
  DEMO_EMPLOYEES,
  DEMO_PARTNERS,
  DEMO_PROJECTS,
  DEMO_INVITATION,
  DEMO_LEGAL_DOCUMENTS,
} from '@field-note/shared/demo';

import { hashPassword } from '../auth/password';
import { hashToken } from '../auth/token';

import type { PrismaClient } from './client';

export type SeedResult = {
  companies: number;
  users: number;
  documents: number;
  invitations: number;
  employees: number;
  partners: number;
  projects: number;
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

  // 직원이 있는 회사는 선택 목록(직종·구분 프리셋)을 먼저 채우고 직원 카드를 입력 (앱이 처음 조회할 때 채우는 것과 같은 내용)
  // 직원은 처음 한 번만 만들고, 이후 화면에서 바꾼 값은 시드가 되돌리지 않음
  for (const companyId of new Set(DEMO_EMPLOYEES.map((employee) => employee.companyId))) {
    for (const kind of OPTION_KINDS) {
      await prisma.optionItem.createMany({
        data: OPTION_PRESETS[kind].map((name, index) => ({
          companyId,
          kind,
          name,
          nameKey: normalizeOptionName(name),
          sortOrder: index,
        })),
        skipDuplicates: true,
      });
    }
  }

  const toDate = (value?: string) => (value ? new Date(`${value}T00:00:00.000Z`) : null);
  const requiredDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

  for (const employee of DEMO_EMPLOYEES) {
    const optionId = async (kind: 'JOB_TYPE' | 'WORKER_TYPE', name?: string) =>
      name
        ? (
            await prisma.optionItem.findFirstOrThrow({
              where: { companyId: employee.companyId, kind, nameKey: normalizeOptionName(name) },
            })
          ).id
        : null;

    await prisma.employee.upsert({
      where: { companyId_id: { companyId: employee.companyId, id: employee.id } },
      update: {},
      create: {
        id: employee.id,
        companyId: employee.companyId,
        name: employee.name,
        title: employee.title ?? null,
        jobTypeId: await optionId('JOB_TYPE', employee.jobType),
        workerTypeId: await optionId('WORKER_TYPE', employee.workerType),
        status: employee.status,
        hiredOn: toDate(employee.hiredOn),
        leftOn: toDate(employee.leftOn),
        birthDate: toDate(employee.birthDate),
        phone: employee.phone ?? null,
        memo: employee.memo ?? null,
      },
    });
  }

  // 고객·협력업체·자재 공급처 명부 (처음 한 번만 만들고, 이후 화면에서 바꾼 값은 시드가 되돌리지 않음)
  for (const partner of DEMO_PARTNERS) {
    await prisma.partner.upsert({
      where: { companyId_id: { companyId: partner.companyId, id: partner.id } },
      update: {},
      create: {
        id: partner.id,
        companyId: partner.companyId,
        kind: partner.kind,
        name: partner.name,
        nameKey: normalizePartnerName(partner.name),
        contactName: partner.contactName ?? null,
        phone: partner.phone ?? null,
        memo: partner.memo ?? null,
        isActive: partner.isActive ?? true,
      },
    });
  }

  // 프로젝트 (고객·담당자·공종은 이름으로 찾아 연결, 처음 한 번만 만들고 이후 화면에서 바꾼 값은 되돌리지 않음)
  for (const project of DEMO_PROJECTS) {
    const byName = async (kind: 'JOB_TYPE' | 'TRADE', name: string) =>
      (
        await prisma.optionItem.findFirstOrThrow({
          where: { companyId: project.companyId, kind, nameKey: normalizeOptionName(name) },
        })
      ).id;
    const client = await prisma.partner.findFirstOrThrow({
      where: {
        companyId: project.companyId,
        kind: 'CLIENT',
        nameKey: normalizePartnerName(project.clientName),
      },
    });
    const manager = await prisma.employee.findFirstOrThrow({
      where: { companyId: project.companyId, name: project.managerName },
    });
    const tradeIds = await Promise.all(project.trades.map((name) => byName('TRADE', name)));

    await prisma.project.upsert({
      where: { companyId_id: { companyId: project.companyId, id: project.id } },
      update: {},
      create: {
        id: project.id,
        companyId: project.companyId,
        code: project.code,
        name: project.name,
        status: project.status,
        siteName: project.siteName,
        siteAddress: project.siteAddress ?? null,
        siteMapUrl: project.siteMapUrl ?? null,
        siteContactName: project.siteContactName ?? null,
        siteContactPhone: project.siteContactPhone ?? null,
        accessMemo: project.accessMemo ?? null,
        clientId: client.id,
        managerId: manager.id,
        contractDate: requiredDate(project.contractDate),
        plannedStart: requiredDate(project.plannedStart),
        plannedEnd: requiredDate(project.plannedEnd),
        memo: project.memo ?? null,
      },
    });
    await prisma.projectTrade.createMany({
      data: tradeIds.map((tradeId) => ({
        companyId: project.companyId,
        projectId: project.id,
        tradeId,
      })),
      skipDuplicates: true,
    });
  }

  // 코드 번호표를 시드의 마지막 번호에 맞춰 화면에서 새로 등록하면 이어서 붙게 함 (이미 더 큰 번호가 있으면 유지)
  const lastNumbers = new Map<string, { companyId: string; year: number; last: number }>();

  for (const project of DEMO_PROJECTS) {
    const [year, number] = project.code.split('-').map(Number) as [number, number];
    const key = `${project.companyId}:${year}`;
    const known = lastNumbers.get(key);

    lastNumbers.set(key, {
      companyId: project.companyId,
      year,
      last: Math.max(known?.last ?? 0, number),
    });
  }

  for (const { companyId, year, last } of lastNumbers.values()) {
    const current = await prisma.projectCodeSequence.findUnique({
      where: { companyId_year: { companyId, year } },
    });

    if (!current || current.lastNumber < last) {
      await prisma.projectCodeSequence.upsert({
        where: { companyId_year: { companyId, year } },
        update: { lastNumber: last },
        create: { companyId, year, lastNumber: last },
      });
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
    employees: DEMO_EMPLOYEES.length,
    partners: DEMO_PARTNERS.length,
    projects: DEMO_PROJECTS.length,
  };
};
