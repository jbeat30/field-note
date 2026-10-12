import {
  FILE_DOWNLOAD_URL_TTL_SECONDS,
  credentialDaysLeft,
  credentialStatus,
  sortCredentials,
  todayInSeoul,
  type CredentialCreate,
  type CredentialUpdate,
  type EmployeeCredential,
  type EmployeeCredentialsResponse,
  type FileUrlResponse,
  type RequiredCredentialsResponse,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';
import type { ObjectStorage } from '../storage/objectStorage';

export class CredentialError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[credential.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type CredentialService = {
  // 직원 카드의 서류 목록 (만료가 빠른 순, 지운 서류 제외)
  list: (companyId: string, employeeId: string) => Promise<EmployeeCredentialsResponse>;
  create: (
    companyId: string,
    userId: string,
    employeeId: string,
    input: CredentialCreate,
  ) => Promise<EmployeeCredential>;
  update: (
    companyId: string,
    employeeId: string,
    credentialId: string,
    input: CredentialUpdate,
  ) => Promise<EmployeeCredential>;
  // 지워도 기록은 남음 (삭제 시각만 기록)
  remove: (companyId: string, employeeId: string, credentialId: string) => Promise<void>;
  // 서류 파일 열람 주소 (열람 기록을 먼저 남긴 같은 트랜잭션 안에서만 발급)
  fileUrl: (
    companyId: string,
    userId: string,
    employeeId: string,
    credentialId: string,
  ) => Promise<FileUrlResponse>;
  // 프로젝트의 필요 자격
  getRequired: (companyId: string, projectId: string) => Promise<RequiredCredentialsResponse>;
  setRequired: (
    companyId: string,
    projectId: string,
    typeIds: string[],
  ) => Promise<RequiredCredentialsResponse>;
};

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const fromDate = (value: Date) => value.toISOString().slice(0, 10);

const invalid = (path: string, message: string) =>
  new CredentialError('INVALID', { path, message });

type Row = Prisma.EmployeeCredentialGetPayload<{ include: { type: true; file: true } }>;

const INCLUDE = { type: true, file: true } as const;

export type CredentialServiceDeps = {
  app: PrismaClient;
  storage: ObjectStorage;
  now?: () => Date;
};

/**
 * @description 직원 서류·자격 서비스 (앱 계정으로 자기 회사 범위에서만 처리). 서류 파일은 직원 서류 용도로 올린 것만
 * 연결할 수 있고, 열람할 때마다 감사 기록을 남긴다 (서비스 기획서 §7.3, §8.4, §12.5)
 * @param deps 앱 계정 Prisma 클라이언트, 객체 저장소, 현재 시각
 * @returns 직원 서류 서비스
 */
export const createCredentialService = ({
  app,
  storage,
  now = () => new Date(),
}: CredentialServiceDeps): CredentialService => {
  const toCredential = (row: Row, today: string): EmployeeCredential => {
    const expiresOn = row.expiresOn ? fromDate(row.expiresOn) : null;

    return {
      id: row.id,
      employeeId: row.employeeId,
      typeId: row.typeId,
      typeName: row.type.name,
      issuedOn: row.issuedOn ? fromDate(row.issuedOn) : null,
      expiresOn,
      status: credentialStatus(expiresOn, today),
      daysLeft: credentialDaysLeft(expiresOn, today),
      memo: row.memo,
      file: row.file
        ? {
            id: row.file.id,
            name: row.file.originalName,
            contentType: row.file.contentType,
            size: Number(row.file.sizeBytes),
            status: row.file.status,
          }
        : null,
      createdAt: row.createdAt.toISOString(),
    };
  };

  const requireEmployee = async (tx: Prisma.TransactionClient, employeeId: string) => {
    const employee = await tx.employee.findFirst({ where: { id: employeeId } });

    if (!employee) {
      throw new CredentialError('NOT_FOUND');
    }

    return employee;
  };

  const requireCredential = async (
    tx: Prisma.TransactionClient,
    employeeId: string,
    credentialId: string,
  ) => {
    const row = await tx.employeeCredential.findFirst({
      where: { id: credentialId, employeeId, removedAt: null },
      include: INCLUDE,
    });

    if (!row) {
      throw new CredentialError('NOT_FOUND');
    }

    return row;
  };

  // 자격 종류 목록(CREDENTIAL_TYPE)에 있는 항목이어야 하고, 새로 쓰는 종류는 사용 중이어야 함
  const assertType = async (tx: Prisma.TransactionClient, typeId: string, path: string) => {
    const type = await tx.optionItem.findFirst({ where: { id: typeId, kind: 'CREDENTIAL_TYPE' } });

    if (!type) {
      throw invalid(path, '자격 종류 목록에 없는 종류입니다');
    }

    if (!type.isActive) {
      throw invalid(path, '사용하지 않는 종류입니다');
    }
  };

  // 이 직원의 서류로 올린 파일만 연결할 수 있음 (다른 직원·프로젝트 파일, 거부된 파일은 불가)
  const assertFile = async (tx: Prisma.TransactionClient, employeeId: string, fileId: string) => {
    const file = await tx.storedFile.findFirst({
      where: { id: fileId, employeeId, purpose: 'EMPLOYEE_DOCUMENT' },
    });

    if (!file) {
      throw invalid('body.fileId', '이 직원의 서류로 올린 파일이 아닙니다');
    }

    if (file.status === 'REJECTED') {
      throw invalid('body.fileId', '검사에서 거부된 파일은 연결할 수 없습니다');
    }
  };

  const listRequired = async (
    tx: Prisma.TransactionClient,
    projectId: string,
  ): Promise<RequiredCredentialsResponse> => {
    const rows = await tx.projectRequiredCredential.findMany({
      where: { projectId },
      include: { type: { select: { name: true, sortOrder: true } } },
    });

    return {
      items: rows
        .sort(
          (a, b) =>
            a.type.sortOrder - b.type.sortOrder || a.createdAt.getTime() - b.createdAt.getTime(),
        )
        .map((row) => ({ typeId: row.typeId, typeName: row.type.name })),
    };
  };

  return {
    list: (companyId, employeeId) =>
      withCompany(app, companyId, async (tx) => {
        await requireEmployee(tx, employeeId);

        const today = todayInSeoul(now());
        const rows = await tx.employeeCredential.findMany({
          where: { employeeId, removedAt: null },
          include: INCLUDE,
        });

        return {
          items: sortCredentials(rows.map((row) => toCredential(row, today))),
        };
      }),

    create: (companyId, userId, employeeId, input) =>
      withCompany(app, companyId, async (tx) => {
        await requireEmployee(tx, employeeId);
        await assertType(tx, input.typeId, 'body.typeId');

        if (input.fileId) {
          await assertFile(tx, employeeId, input.fileId);
        }

        const created = await tx.employeeCredential.create({
          data: {
            companyId,
            employeeId,
            typeId: input.typeId,
            issuedOn: input.issuedOn ? toDate(input.issuedOn) : null,
            expiresOn: input.expiresOn ? toDate(input.expiresOn) : null,
            fileId: input.fileId ?? null,
            memo: input.memo || null,
            createdBy: userId,
          },
          include: INCLUDE,
        });

        return toCredential(created, todayInSeoul(now()));
      }),

    update: (companyId, employeeId, credentialId, input) =>
      withCompany(app, companyId, async (tx) => {
        const current = await requireCredential(tx, employeeId, credentialId);

        if (input.typeId !== undefined && input.typeId !== current.typeId) {
          await assertType(tx, input.typeId, 'body.typeId');
        }

        if (input.fileId && input.fileId !== current.fileId) {
          await assertFile(tx, employeeId, input.fileId);
        }

        // 날짜 순서는 저장된 값과 합쳐서 다시 확인 (한쪽만 바꿔도 순서가 어긋나지 않게)
        const issuedOn =
          input.issuedOn !== undefined
            ? input.issuedOn
            : current.issuedOn
              ? fromDate(current.issuedOn)
              : null;
        const expiresOn =
          input.expiresOn !== undefined
            ? input.expiresOn
            : current.expiresOn
              ? fromDate(current.expiresOn)
              : null;

        if (issuedOn && expiresOn && issuedOn > expiresOn) {
          throw invalid('body.expiresOn', '만료일은 취득일보다 빠를 수 없습니다');
        }

        const updated = await tx.employeeCredential.update({
          where: { companyId_id: { companyId, id: credentialId } },
          data: {
            ...(input.typeId !== undefined ? { typeId: input.typeId } : {}),
            ...(input.issuedOn !== undefined
              ? { issuedOn: input.issuedOn ? toDate(input.issuedOn) : null }
              : {}),
            ...(input.expiresOn !== undefined
              ? { expiresOn: input.expiresOn ? toDate(input.expiresOn) : null }
              : {}),
            ...(input.fileId !== undefined ? { fileId: input.fileId } : {}),
            ...(input.memo !== undefined ? { memo: input.memo || null } : {}),
          },
          include: INCLUDE,
        });

        return toCredential(updated, todayInSeoul(now()));
      }),

    remove: (companyId, employeeId, credentialId) =>
      withCompany(app, companyId, async (tx) => {
        await requireCredential(tx, employeeId, credentialId);
        await tx.employeeCredential.update({
          where: { companyId_id: { companyId, id: credentialId } },
          data: { removedAt: now() },
        });
      }),

    fileUrl: async (companyId, userId, employeeId, credentialId) => {
      const at = now();
      const { key, fileName } = await withCompany(app, companyId, async (tx) => {
        const row = await requireCredential(tx, employeeId, credentialId);

        if (!row.file) {
          throw new CredentialError('NOT_FOUND');
        }

        if (row.file.status !== 'READY') {
          throw invalid('params.credentialId', '검사가 끝난 파일만 열 수 있습니다');
        }

        await tx.auditLog.create({
          data: {
            companyId,
            action: 'EMPLOYEE_DOCUMENT_VIEWED',
            actorId: userId,
            targetId: employeeId,
            detail: { credentialId, typeName: row.type.name, fileName: row.file.originalName },
            createdAt: at,
          },
        });

        return { key: row.file.objectKey, fileName: row.file.originalName };
      });

      return {
        url: await storage.presignDownload(key, {
          expiresInSeconds: FILE_DOWNLOAD_URL_TTL_SECONDS,
          fileName,
        }),
        expiresAt: new Date(at.getTime() + FILE_DOWNLOAD_URL_TTL_SECONDS * 1000).toISOString(),
      };
    },

    getRequired: (companyId, projectId) =>
      withCompany(app, companyId, async (tx) => {
        if (!(await tx.project.findFirst({ where: { id: projectId } }))) {
          throw new CredentialError('NOT_FOUND');
        }

        return listRequired(tx, projectId);
      }),

    setRequired: (companyId, projectId, typeIds) =>
      withCompany(app, companyId, async (tx) => {
        if (!(await tx.project.findFirst({ where: { id: projectId } }))) {
          throw new CredentialError('NOT_FOUND');
        }

        const wanted = [...new Set(typeIds)];
        const current = await tx.projectRequiredCredential.findMany({ where: { projectId } });
        const kept = new Set(current.map((row) => row.typeId));

        // 새로 넣는 종류만 목록에서 확인 (이미 지정한 종류는 숨겨졌어도 유지할 수 있음)
        for (const typeId of wanted.filter((id) => !kept.has(id))) {
          await assertType(tx, typeId, 'body.typeIds');
        }

        const removed = current.filter((row) => !wanted.includes(row.typeId));

        if (removed.length > 0) {
          await tx.projectRequiredCredential.deleteMany({
            where: { projectId, typeId: { in: removed.map((row) => row.typeId) } },
          });
        }

        const added = wanted.filter((id) => !kept.has(id));

        if (added.length > 0) {
          await tx.projectRequiredCredential.createMany({
            data: added.map((typeId) => ({ companyId, projectId, typeId })),
          });
        }

        return listRequired(tx, projectId);
      }),
  };
};
