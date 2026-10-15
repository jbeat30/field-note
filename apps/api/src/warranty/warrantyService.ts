import {
  computeWarrantyEnd,
  resolveWarrantyUpdate,
  todayInSeoul,
  warrantyDaysLeft,
  warrantyProjectCheck,
  type ProjectWarranty,
  type WarrantyCertificateCreate,
  type WarrantyCertificateUpdate,
  type WarrantyUpdate,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { loadRules } from '../company/companyRules';
import { withCompany } from '../db/withCompany';

export class WarrantyError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[warranty.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type WarrantyService = {
  // 보증 설정·보증서·변경 이력, 설정이 없으면 기본 기간과 실제 완료일로 계산한 값을 미리 표시
  get: (companyId: string, projectId: string) => Promise<ProjectWarranty>;
  // 보증 설정 저장 (완료·보증 중에서만, 이미 설정이 있거나 종료 예정일을 직접 바꾸면 사유 필수)
  update: (
    companyId: string,
    userId: string,
    projectId: string,
    input: WarrantyUpdate,
  ) => Promise<ProjectWarranty>;
  addCertificate: (
    companyId: string,
    userId: string,
    projectId: string,
    input: WarrantyCertificateCreate,
  ) => Promise<ProjectWarranty>;
  updateCertificate: (
    companyId: string,
    projectId: string,
    certificateId: string,
    input: WarrantyCertificateUpdate,
  ) => Promise<ProjectWarranty>;
  // 지워도 기록은 남음 (삭제 시각만 기록)
  removeCertificate: (
    companyId: string,
    projectId: string,
    certificateId: string,
  ) => Promise<ProjectWarranty>;
};

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const fromDate = (value: Date) => value.toISOString().slice(0, 10);

const invalid = (path: string, message: string) => new WarrantyError('INVALID', { path, message });

/**
 * @description 상태 전환이 읽는 보증 정보: 저장된 설정의 기간·종료 예정일 (없으면 기본 기간과 null)
 * @param tx 회사 범위 트랜잭션
 * @param projectId 프로젝트
 * @returns 보증 기간(개월)과 종료 예정일
 */
export const loadWarrantyForTransition = async (
  tx: Prisma.TransactionClient,
  projectId: string,
) => {
  const record = await tx.projectWarranty.findFirst({ where: { projectId } });
  const { warrantyDefaultMonths } = await loadRules(tx);

  return {
    exists: record !== null,
    months: record?.months ?? warrantyDefaultMonths,
    endOn: record ? fromDate(record.endOn) : null,
  };
};

/**
 * @description 완료 → 보증 중 전환에서 설정이 없으면 기본값(12개월, 실제 완료일 기준)으로 만든다
 * @param tx 회사 범위 트랜잭션
 * @param companyId 회사
 * @param userId 변경자
 * @param projectId 프로젝트
 * @param actualEnd 프로젝트 실제 완료일
 */
export const createDefaultWarranty = async (
  tx: Prisma.TransactionClient,
  companyId: string,
  userId: string,
  projectId: string,
  actualEnd: string,
) => {
  const { warrantyDefaultMonths } = await loadRules(tx);
  const endOn = computeWarrantyEnd(actualEnd, warrantyDefaultMonths);

  await tx.projectWarranty.create({
    data: {
      companyId,
      projectId,
      months: warrantyDefaultMonths,
      startBasis: 'ACTUAL_END',
      startOn: toDate(actualEnd),
      endOn: toDate(endOn),
      updatedBy: userId,
    },
  });
  await tx.projectWarrantyChange.create({
    data: {
      companyId,
      projectId,
      fromMonths: null,
      toMonths: warrantyDefaultMonths,
      fromEndOn: null,
      toEndOn: toDate(endOn),
      startBasis: 'ACTUAL_END',
      startOn: toDate(actualEnd),
      reason: null,
      changedBy: userId,
    },
  });
};

/**
 * @description 보증 서비스 (앱 계정으로 자기 회사 범위에서만, 설정 변경은 이력으로 남기고 보증서는 지워도 기록이 남음)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param now 현재 시각 (시험에서 고정)
 * @returns 보증 서비스
 */
export const createWarrantyService = (
  app: PrismaClient,
  now: () => Date = () => new Date(),
): WarrantyService => {
  const requireProject = async (tx: Prisma.TransactionClient, projectId: string) => {
    const project = await tx.project.findFirst({ where: { id: projectId } });

    if (!project) {
      throw new WarrantyError('NOT_FOUND');
    }

    return project;
  };

  const assertAllows = (status: Prisma.ProjectGetPayload<object>['status']) => {
    const checked = warrantyProjectCheck(status);

    if (!checked.ok) {
      throw invalid(`body.${checked.path}`, checked.message);
    }
  };

  const load = async (
    tx: Prisma.TransactionClient,
    projectId: string,
  ): Promise<ProjectWarranty> => {
    const project = await requireProject(tx, projectId);
    const today = todayInSeoul(now());
    const [record, certificates, changes] = await Promise.all([
      tx.projectWarranty.findFirst({ where: { projectId } }),
      tx.warrantyCertificate.findMany({
        where: { projectId, removedAt: null },
        include: { document: { select: { title: true, isSensitive: true } } },
        orderBy: [{ expiresOn: 'asc' }, { id: 'asc' }],
      }),
      tx.projectWarrantyChange.findMany({
        where: { projectId },
        orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    const actualEnd = project.actualEnd ? fromDate(project.actualEnd) : null;
    // 설정이 없으면 기본 기간과 실제 완료일로 계산한 값을 보여 줌
    const startOn = record ? fromDate(record.startOn) : actualEnd;
    const { warrantyDefaultMonths } = await loadRules(tx);
    const months = record?.months ?? warrantyDefaultMonths;
    const endOn = record
      ? fromDate(record.endOn)
      : actualEnd
        ? computeWarrantyEnd(actualEnd, months)
        : null;

    return {
      configured: record !== null,
      months,
      startBasis: record?.startBasis ?? 'ACTUAL_END',
      startOn,
      endOn,
      defaultMonths: warrantyDefaultMonths,
      daysLeft: endOn ? warrantyDaysLeft(endOn, today) : null,
      certificates: certificates.map((row) => ({
        id: row.id,
        documentId: row.documentId,
        title: row.document.title,
        isSensitive: row.document.isSensitive,
        issuer: row.issuer,
        expiresOn: fromDate(row.expiresOn),
        daysLeft: warrantyDaysLeft(fromDate(row.expiresOn), today),
        createdAt: row.createdAt.toISOString(),
      })),
      changes: changes.map((row) => ({
        id: row.id,
        fromMonths: row.fromMonths,
        toMonths: row.toMonths,
        fromEndOn: row.fromEndOn ? fromDate(row.fromEndOn) : null,
        toEndOn: fromDate(row.toEndOn),
        startBasis: row.startBasis,
        startOn: fromDate(row.startOn),
        reason: row.reason,
        changedAt: row.changedAt.toISOString(),
      })),
    };
  };

  return {
    get: (companyId, projectId) => withCompany(app, companyId, (tx) => load(tx, projectId)),

    update: (companyId, userId, projectId, input) =>
      withCompany(app, companyId, async (tx) => {
        // 프로젝트 행을 잠가 같은 프로젝트의 설정을 동시에 바꿔도 이력이 어긋나지 않게 함
        await tx.$queryRaw`SELECT id FROM projects WHERE id = ${projectId}::uuid FOR UPDATE`;

        const project = await requireProject(tx, projectId);

        assertAllows(project.status);

        if (project.status === 'WARRANTY' && input.months === 0) {
          throw invalid(
            'body.months',
            '보증 중인 프로젝트는 보증 기간을 0개월로 바꿀 수 없습니다. 종료 처리로 조기 종료해 주세요',
          );
        }

        const current = await tx.projectWarranty.findFirst({ where: { projectId } });
        const resolved = resolveWarrantyUpdate({
          input,
          actualEnd: project.actualEnd ? fromDate(project.actualEnd) : null,
          hasRecord: current !== null,
        });

        if (!resolved.ok) {
          throw invalid(`body.${resolved.path}`, resolved.message);
        }

        if (
          current &&
          current.months === input.months &&
          current.startBasis === input.startBasis &&
          fromDate(current.startOn) === resolved.startOn &&
          fromDate(current.endOn) === resolved.endOn
        ) {
          throw invalid('body.months', '바뀐 내용이 없습니다');
        }

        const data = {
          months: input.months,
          startBasis: input.startBasis,
          startOn: toDate(resolved.startOn),
          endOn: toDate(resolved.endOn),
          updatedBy: userId,
        };

        if (current) {
          await tx.projectWarranty.update({
            where: { companyId_projectId: { companyId, projectId } },
            data: { ...data, updatedAt: now() },
          });
        } else {
          await tx.projectWarranty.create({ data: { companyId, projectId, ...data } });
        }

        await tx.projectWarrantyChange.create({
          data: {
            companyId,
            projectId,
            fromMonths: current?.months ?? null,
            toMonths: input.months,
            fromEndOn: current?.endOn ?? null,
            toEndOn: toDate(resolved.endOn),
            startBasis: input.startBasis,
            startOn: toDate(resolved.startOn),
            reason: resolved.reason,
            changedBy: userId,
          },
        });

        return load(tx, projectId);
      }),

    addCertificate: (companyId, userId, projectId, input) =>
      withCompany(app, companyId, async (tx) => {
        const project = await requireProject(tx, projectId);

        assertAllows(project.status);

        // 같은 프로젝트의 삭제되지 않은 문서만 보증서로 등록할 수 있다 (다른 회사·다른 프로젝트 문서는 없는 것으로 취급)
        const document = await tx.document.findFirst({
          where: { id: input.documentId, projectId, deletedAt: null },
          select: { id: true },
        });

        if (!document) {
          throw invalid('body.documentId', '선택할 수 없는 문서입니다');
        }

        if (
          await tx.warrantyCertificate.findFirst({
            where: { projectId, documentId: input.documentId, removedAt: null },
            select: { id: true },
          })
        ) {
          throw invalid('body.documentId', '이미 등록된 보증서입니다');
        }

        await tx.warrantyCertificate.create({
          data: {
            companyId,
            projectId,
            documentId: input.documentId,
            issuer: input.issuer?.trim() || null,
            expiresOn: toDate(input.expiresOn),
            createdBy: userId,
          },
        });

        return load(tx, projectId);
      }),

    updateCertificate: (companyId, projectId, certificateId, input) =>
      withCompany(app, companyId, async (tx) => {
        const project = await requireProject(tx, projectId);

        assertAllows(project.status);

        const updated = await tx.warrantyCertificate.updateMany({
          where: { companyId, id: certificateId, projectId, removedAt: null },
          data: {
            ...(input.expiresOn ? { expiresOn: toDate(input.expiresOn) } : {}),
            ...(input.issuer === undefined ? {} : { issuer: input.issuer?.trim() || null }),
          },
        });

        if (updated.count === 0) {
          throw new WarrantyError('NOT_FOUND');
        }

        return load(tx, projectId);
      }),

    removeCertificate: (companyId, projectId, certificateId) =>
      withCompany(app, companyId, async (tx) => {
        const project = await requireProject(tx, projectId);

        assertAllows(project.status);

        const removed = await tx.warrantyCertificate.updateMany({
          where: { companyId, id: certificateId, projectId, removedAt: null },
          data: { removedAt: now() },
        });

        if (removed.count === 0) {
          throw new WarrantyError('NOT_FOUND');
        }

        return load(tx, projectId);
      }),
  };
};
