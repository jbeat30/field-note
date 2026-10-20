import { createHash } from 'node:crypto';

import {
  OPTION_KINDS,
  OPTION_PRESETS,
  normalizeOptionName,
  normalizePartnerName,
} from '@field-note/shared';
import {
  DEMO_ACCOUNTS,
  DEMO_ASSIGNMENTS,
  DEMO_CHANGE_WORKS,
  DEMO_REPAIRS,
  DEMO_REQUIRED_CREDENTIALS,
  DEMO_WARRANTIES,
  DEMO_PAY_RATES,
  DEMO_PROGRESS,
  DEMO_CREDENTIALS,
  DEMO_EMPLOYEES,
  DEMO_PARTNERS,
  DEMO_PROJECTS,
  DEMO_WORK_LOGS,
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
  assignments: number;
  workLogs: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// 시드가 입력하는 업무 데이터 묶음 (로컬 개발용 기본 묶음과 운영 시연 회사 묶음이 같은 입력 코드를 씀)
export type DemoDataset = {
  accounts: typeof DEMO_ACCOUNTS;
  employees: typeof DEMO_EMPLOYEES;
  partners: typeof DEMO_PARTNERS;
  projects: typeof DEMO_PROJECTS;
  assignments: typeof DEMO_ASSIGNMENTS;
  workLogs: typeof DEMO_WORK_LOGS;
  changeWorks: typeof DEMO_CHANGE_WORKS;
  warranties: typeof DEMO_WARRANTIES;
  credentials: typeof DEMO_CREDENTIALS;
  requiredCredentials: typeof DEMO_REQUIRED_CREDENTIALS;
  repairs: typeof DEMO_REPAIRS;
  payRates: typeof DEMO_PAY_RATES;
  progress: typeof DEMO_PROGRESS;
};

export const LOCAL_DEMO_DATASET: DemoDataset = {
  accounts: DEMO_ACCOUNTS,
  employees: DEMO_EMPLOYEES,
  partners: DEMO_PARTNERS,
  projects: DEMO_PROJECTS,
  assignments: DEMO_ASSIGNMENTS,
  workLogs: DEMO_WORK_LOGS,
  changeWorks: DEMO_CHANGE_WORKS,
  warranties: DEMO_WARRANTIES,
  credentials: DEMO_CREDENTIALS,
  requiredCredentials: DEMO_REQUIRED_CREDENTIALS,
  repairs: DEMO_REPAIRS,
  payRates: DEMO_PAY_RATES,
  progress: DEMO_PROGRESS,
};

export type SeedOptions = {
  dataset?: DemoDataset;
  // draft: 개발용 약관 초안을 DB에 직접 입력, registered: 운영자 CLI(legal-register)로 등록된 약관에 동의 이력만 남김
  legal?: 'draft' | 'registered';
  // 가입 전 회사와 1회용 초대 링크 생성 여부 (개발용)
  withInvitation?: boolean;
};

export class LegalNotRegisteredError extends Error {
  constructor() {
    super('[db.seed] 등록된 약관이 없음 (먼저 pnpm operator legal-register 실행)');
  }
}

// 효력이 생긴 문서 중 종류별 최신 버전의 필수 문서
const findRegisteredRequiredDocuments = async (prisma: PrismaClient) => {
  const rows = await prisma.legalDocument.findMany({
    where: { effectiveAt: { lte: new Date() } },
    orderBy: { effectiveAt: 'desc' },
  });
  const latestByType = new Map<string, (typeof rows)[number]>();

  for (const row of rows) {
    if (!latestByType.has(row.type)) latestByType.set(row.type, row);
  }

  const documents = [...latestByType.values()];

  if (!documents.some((document) => document.isRequired)) {
    throw new LegalNotRegisteredError();
  }

  return documents;
};

// 문서 본문 해시 (운영자 등록 `registerLegalDocuments`와 같은 알고리즘, 같은 본문이면 같은 값)
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/**
 * @description 로컬 개발용 더미 데이터 입력 (여러 번 실행해도 같은 결과, 소유 계정 클라이언트 전용)
 * 회사·계정·약관 버전·동의 이력과 가입 전 회사의 1회용 초대 링크(`demo-invite-0001`) 생성, 회사 설정(기준시간·월 기준일수·공수 방식)
 * @param prisma 소유 계정(DATABASE_MIGRATE_URL) Prisma 클라이언트
 * @param options 입력할 데이터 묶음과 약관·초대 처리 방식 (기본은 로컬 개발용)
 * @returns 입력한 개수
 * @throws legal이 registered인데 등록된 약관이 없는 경우
 */
export const seedDemoData = async (
  prisma: PrismaClient,
  options: SeedOptions = {},
): Promise<SeedResult> => {
  const { dataset = LOCAL_DEMO_DATASET, legal = 'draft', withInvitation = true } = options;
  const documents =
    legal === 'registered'
      ? await findRegisteredRequiredDocuments(prisma)
      : await Promise.all(
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

  for (const account of dataset.accounts) {
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
  for (const companyId of new Set(dataset.employees.map((employee) => employee.companyId))) {
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

  for (const employee of dataset.employees) {
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
  for (const partner of dataset.partners) {
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
  for (const project of dataset.projects) {
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
        actualStart: project.actualStart ? requiredDate(project.actualStart) : null,
        actualEnd: project.actualEnd ? requiredDate(project.actualEnd) : null,
        memo: project.memo ?? null,
      },
    });

    // 상태 변경 이력은 처음 한 번만 넣음 (변경자는 그 회사의 관리자)
    if (
      project.history &&
      (await prisma.projectStatusChange.count({
        where: { companyId: project.companyId, projectId: project.id },
      })) === 0
    ) {
      const admin = dataset.accounts.find((account) => account.companyId === project.companyId);

      if (admin) {
        for (const change of project.history) {
          await prisma.projectStatusChange.create({
            data: {
              companyId: project.companyId,
              projectId: project.id,
              fromStatus: change.fromStatus,
              toStatus: change.toStatus,
              effectiveOn: requiredDate(change.effectiveOn),
              reason: change.reason ?? null,
              changedBy: admin.userId,
            },
          });
        }
      }
    }
    await prisma.projectTrade.createMany({
      data: tradeIds.map((tradeId) => ({
        companyId: project.companyId,
        projectId: project.id,
        tradeId,
      })),
      skipDuplicates: true,
    });

    // 예정 기간 변경 이력은 처음 한 번만 넣음
    if (
      project.periodChanges &&
      (await prisma.projectPeriodChange.count({
        where: { companyId: project.companyId, projectId: project.id },
      })) === 0
    ) {
      const admin = dataset.accounts.find((account) => account.companyId === project.companyId);

      if (admin) {
        for (const change of project.periodChanges) {
          await prisma.projectPeriodChange.create({
            data: {
              companyId: project.companyId,
              projectId: project.id,
              fromStart: requiredDate(change.fromStart),
              fromEnd: requiredDate(change.fromEnd),
              toStart: requiredDate(change.toStart),
              toEnd: requiredDate(change.toEnd),
              reason: change.reason ?? null,
              changedBy: admin.userId,
            },
          });
        }
      }
    }
  }

  // 투입 (프로젝트 코드와 직원 이름으로 연결, 처음 한 번만 만들고 이후 화면에서 바꾼 값은 되돌리지 않음)
  for (const assignment of dataset.assignments) {
    const project = await prisma.project.findFirstOrThrow({
      where: { companyId: assignment.companyId, code: assignment.projectCode },
    });
    const employee = await prisma.employee.findFirstOrThrow({
      where: { companyId: assignment.companyId, name: assignment.employeeName },
    });

    await prisma.projectAssignment.upsert({
      where: { companyId_id: { companyId: assignment.companyId, id: assignment.id } },
      update: {},
      create: {
        id: assignment.id,
        companyId: assignment.companyId,
        projectId: project.id,
        employeeId: employee.id,
        startDate: requiredDate(assignment.startDate),
        endDate: requiredDate(assignment.endDate),
        plannedMinutes: assignment.plannedMinutes ?? null,
        cancelledAt: assignment.cancelled ? new Date() : null,
      },
    });
  }

  // 변경·추가 작업 (프로젝트 코드로 연결, 기록자는 해당 회사의 데모 관리자, 최초 한 번만 생성)
  for (const item of dataset.changeWorks) {
    const project = await prisma.project.findFirstOrThrow({
      where: { companyId: item.companyId, code: item.projectCode },
    });
    const admin = dataset.accounts.find((account) => account.companyId === item.companyId);

    if (
      admin &&
      !(await prisma.changeWork.findUnique({
        where: { companyId_id: { companyId: item.companyId, id: item.id } },
      }))
    ) {
      await prisma.changeWork.create({
        data: {
          id: item.id,
          companyId: item.companyId,
          projectId: project.id,
          seq: item.seq,
          requestedOn: requiredDate(item.requestedOn),
          requester: item.requester,
          content: item.content,
          status: item.status,
          statusChangedOn: requiredDate(item.statusChangedOn),
          createdBy: admin.userId,
        },
      });

      for (const change of item.history ?? []) {
        await prisma.changeWorkStatusChange.create({
          data: {
            companyId: item.companyId,
            changeWorkId: item.id,
            fromStatus: change.fromStatus,
            toStatus: change.toStatus,
            effectiveOn: requiredDate(change.effectiveOn),
            note: change.note ?? null,
            changedBy: admin.userId,
          },
        });
      }
    }
  }

  // 보증 설정 (프로젝트 코드로 연결, 입력자는 해당 회사의 데모 관리자, 최초 한 번만 생성)
  for (const item of dataset.warranties) {
    const project = await prisma.project.findFirstOrThrow({
      where: { companyId: item.companyId, code: item.projectCode },
    });
    const admin = dataset.accounts.find((account) => account.companyId === item.companyId);

    if (
      admin &&
      !(await prisma.projectWarranty.findUnique({
        where: { companyId_projectId: { companyId: item.companyId, projectId: project.id } },
      }))
    ) {
      await prisma.projectWarranty.create({
        data: {
          companyId: item.companyId,
          projectId: project.id,
          months: item.months,
          startBasis: item.startBasis,
          startOn: requiredDate(item.startOn),
          endOn: requiredDate(item.endOn),
          updatedBy: admin.userId,
        },
      });
      await prisma.projectWarrantyChange.create({
        data: {
          companyId: item.companyId,
          projectId: project.id,
          fromMonths: null,
          toMonths: item.months,
          fromEndOn: null,
          toEndOn: requiredDate(item.endOn),
          startBasis: item.startBasis,
          startOn: requiredDate(item.startOn),
          changedBy: admin.userId,
        },
      });
    }
  }

  // 직원 서류·필요 자격 (자격 종류는 선택 목록 이름으로 연결, 서류는 직원에게 한 건도 없을 때만 최초 한 번 생성)
  const credentialTypeId = async (companyId: string, name: string) =>
    (
      await prisma.optionItem.findFirstOrThrow({
        where: { companyId, kind: 'CREDENTIAL_TYPE', nameKey: normalizeOptionName(name) },
      })
    ).id;

  for (const item of dataset.credentials) {
    const admin = dataset.accounts.find((account) => account.companyId === item.companyId);

    if (
      admin &&
      !(await prisma.employeeCredential.findFirst({
        where: { companyId: item.companyId, employeeId: item.employeeId },
      }))
    ) {
      // 같은 직원의 서류는 한꺼번에 만듦 (일부만 만들어진 채로 남지 않게 첫 서류 기준으로 판단)
      for (const own of dataset.credentials.filter(
        (candidate) =>
          candidate.companyId === item.companyId && candidate.employeeId === item.employeeId,
      )) {
        await prisma.employeeCredential.create({
          data: {
            companyId: own.companyId,
            employeeId: own.employeeId,
            typeId: await credentialTypeId(own.companyId, own.typeName),
            issuedOn: toDate(own.issuedOn),
            expiresOn: toDate(own.expiresOn),
            memo: own.memo ?? null,
            createdBy: admin.userId,
          },
        });
      }
    }
  }

  for (const item of dataset.requiredCredentials) {
    const project = await prisma.project.findFirstOrThrow({
      where: { companyId: item.companyId, code: item.projectCode },
    });

    for (const name of item.typeNames) {
      await prisma.projectRequiredCredential.createMany({
        data: [
          {
            companyId: item.companyId,
            projectId: project.id,
            typeId: await credentialTypeId(item.companyId, name),
          },
        ],
        skipDuplicates: true,
      });
    }
  }

  // 보수 요청 (프로젝트 코드로 연결, 기록자는 해당 회사의 데모 관리자, 최초 한 번만 생성)
  for (const item of dataset.repairs) {
    const project = await prisma.project.findFirstOrThrow({
      where: { companyId: item.companyId, code: item.projectCode },
    });
    const admin = dataset.accounts.find((account) => account.companyId === item.companyId);

    if (
      admin &&
      !(await prisma.repairRequest.findUnique({
        where: { companyId_id: { companyId: item.companyId, id: item.id } },
      }))
    ) {
      await prisma.repairRequest.create({
        data: {
          id: item.id,
          companyId: item.companyId,
          projectId: project.id,
          seq: item.seq,
          receivedOn: requiredDate(item.receivedOn),
          requester: item.requester,
          content: item.content,
          location: item.location ?? null,
          status: item.status,
          statusChangedOn: requiredDate(item.statusChangedOn),
          resolvedOn: item.resolvedOn ? requiredDate(item.resolvedOn) : null,
          createdBy: admin.userId,
        },
      });

      for (const change of item.history ?? []) {
        await prisma.repairRequestStatusChange.create({
          data: {
            companyId: item.companyId,
            repairRequestId: item.id,
            fromStatus: change.fromStatus,
            toStatus: change.toStatus,
            effectiveOn: requiredDate(change.effectiveOn),
            note: change.note ?? null,
            changedBy: admin.userId,
          },
        });
      }
    }
  }

  // 직원 단가 (직원 이름으로 연결, 입력자는 해당 회사의 데모 관리자, 최초 한 번만 생성, 화면 확인용 가짜 금액)
  for (const rate of dataset.payRates) {
    const employee = await prisma.employee.findFirstOrThrow({
      where: { companyId: rate.companyId, name: rate.employeeName },
    });
    const admin = dataset.accounts.find((account) => account.companyId === rate.companyId);

    if (admin) {
      await prisma.employeePayRate.upsert({
        where: { companyId_id: { companyId: rate.companyId, id: rate.id } },
        update: {},
        create: {
          id: rate.id,
          companyId: rate.companyId,
          employeeId: employee.id,
          payType: rate.payType,
          amount: rate.amount,
          effectiveFrom: requiredDate(rate.effectiveFrom),
          createdBy: admin.userId,
        },
      });
    }
  }

  // 진행률 기록 (프로젝트 코드로 연결, 기록자는 해당 회사의 데모 관리자, 최초 한 번만 생성)
  for (const record of dataset.progress) {
    const project = await prisma.project.findFirstOrThrow({
      where: { companyId: record.companyId, code: record.projectCode },
    });
    const admin = dataset.accounts.find((account) => account.companyId === record.companyId);

    if (admin) {
      await prisma.projectProgressRecord.upsert({
        where: { companyId_id: { companyId: record.companyId, id: record.id } },
        update: {},
        create: {
          id: record.id,
          companyId: record.companyId,
          projectId: project.id,
          percent: record.percent,
          recordedOn: requiredDate(record.recordedOn),
          note: record.note ?? null,
          recordedBy: admin.userId,
        },
      });
    }
  }

  // 작업 내역 (프로젝트 코드·직원 이름·작업 구분 이름으로 연결, 처음 한 번만 만들고 이후 화면에서 바꾼 값은 되돌리지 않음)
  for (const log of dataset.workLogs) {
    if (
      await prisma.workLog.findUnique({
        where: { companyId_id: { companyId: log.companyId, id: log.id } },
      })
    ) {
      continue;
    }

    const project = await prisma.project.findFirstOrThrow({
      where: { companyId: log.companyId, code: log.projectCode },
    });
    const admin = dataset.accounts.find((account) => account.companyId === log.companyId);
    const toEntries = async (
      items: readonly { employeeName: string; categoryName: string; minutes: number }[],
    ) =>
      Promise.all(
        items.map(async (item) => ({
          employeeId: (
            await prisma.employee.findFirstOrThrow({
              where: { companyId: log.companyId, name: item.employeeName },
            })
          ).id,
          categoryId: (
            await prisma.optionItem.findFirstOrThrow({
              where: {
                companyId: log.companyId,
                kind: 'WORK_CATEGORY',
                nameKey: normalizeOptionName(item.categoryName),
              },
            })
          ).id,
          minutes: item.minutes,
        })),
      );
    const revisions = log.revisions ?? [];

    await prisma.workLog.create({
      data: {
        id: log.id,
        companyId: log.companyId,
        projectId: project.id,
        workDate: requiredDate(log.workDate),
        status: log.status,
        content: log.content,
        area: log.area ?? null,
        notes: log.notes ?? null,
        isChange: log.isChange ?? false,
        // 작업한 날 저녁에 저장한 것으로 두어 지연 입력으로 표시되지 않게 함
        savedAt: log.status === 'SAVED' ? new Date(`${log.workDate}T10:00:00.000Z`) : null,
        // 고친 횟수만큼 버전이 올라간 상태
        version: 1 + revisions.length,
      },
    });
    await prisma.workLogEntry.createMany({
      data: (await toEntries(log.entries)).map((entry) => ({
        companyId: log.companyId,
        workLogId: log.id,
        ...entry,
      })),
    });

    for (const [index, revision] of revisions.entries()) {
      await prisma.workLogRevision.create({
        data: {
          companyId: log.companyId,
          workLogId: log.id,
          version: index + 1,
          snapshot: {
            status: 'SAVED',
            content: revision.content,
            area: revision.area ?? null,
            notes: null,
            isChange: false,
            isAfterService: false,
            entries: await toEntries(revision.entries),
          },
          changedBy: admin!.userId,
        },
      });
    }
  }

  // 코드 번호표를 시드의 마지막 번호에 맞춰 화면에서 새로 등록하면 이어서 붙게 함 (이미 더 큰 번호가 있으면 유지)
  const lastNumbers = new Map<string, { companyId: string; year: number; last: number }>();

  for (const project of dataset.projects) {
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
  if (withInvitation) {
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
  }

  return {
    companies: dataset.accounts.length + (withInvitation ? 1 : 0),
    users: dataset.accounts.length + (withInvitation ? 1 : 0),
    documents: documents.length,
    invitations: withInvitation ? 1 : 0,
    employees: dataset.employees.length,
    partners: dataset.partners.length,
    projects: dataset.projects.length,
    assignments: dataset.assignments.length,
    workLogs: dataset.workLogs.length,
  };
};
