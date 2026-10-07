import {
  EMPLOYEE_MAX_PER_COMPANY,
  EMPLOYEE_STATUSES,
  resolveEmployeeStatus,
  todayInSeoul,
  type EmployeeCreate,
  type EmployeeDetail,
  type EmployeeListQuery,
  type EmployeeSummary,
  type EmployeeUpdate,
  type OptionKind,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

type Clock = () => Date;

export class EmployeeError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'LIMIT' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[employee.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type EmployeeService = {
  // 목록 (생년월일·연락처 제외). 재직 → 휴직 → 퇴사 순, 같은 상태 안에서는 이름순
  list: (companyId: string, query: EmployeeListQuery) => Promise<EmployeeSummary[]>;
  // 카드 (생년월일·연락처 포함)
  get: (companyId: string, id: string) => Promise<EmployeeDetail>;
  create: (companyId: string, input: EmployeeCreate) => Promise<EmployeeDetail>;
  update: (companyId: string, id: string, input: EmployeeUpdate) => Promise<EmployeeDetail>;
};

type Row = Prisma.EmployeeGetPayload<object>;

// DATE 컬럼은 시간대 없이 날짜만 다루므로 UTC 자정으로 넣고 읽을 때 날짜 부분만 사용
const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(`${value}T00:00:00.000Z`);
const fromDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

const toSummary = (row: Row): EmployeeSummary => ({
  id: row.id,
  name: row.name,
  title: row.title,
  jobTypeId: row.jobTypeId,
  workerTypeId: row.workerTypeId,
  status: row.status,
  hiredOn: fromDate(row.hiredOn),
  leftOn: fromDate(row.leftOn),
});

const toDetail = (row: Row): EmployeeDetail => ({
  ...toSummary(row),
  birthDate: fromDate(row.birthDate),
  phone: row.phone,
  memo: row.memo,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

// 직종·직원 구분은 같은 회사의 해당 종류 항목만 고를 수 있다 (다른 회사 항목은 RLS로 보이지 않음)
// 숨긴 항목은 새로 고를 수 없지만, 이미 그 항목을 쓰고 있는 직원은 그대로 둘 수 있다
const assertOption = async (
  tx: Prisma.TransactionClient,
  kind: OptionKind,
  path: string,
  label: string,
  id: string | null | undefined,
  currentId: string | null,
) => {
  if (!id || id === currentId) {
    return;
  }

  const option = await tx.optionItem.findFirst({ where: { id, kind } });

  if (!option) {
    throw new EmployeeError('INVALID', { path, message: `선택할 수 없는 ${label}입니다` });
  }

  if (!option.isActive) {
    throw new EmployeeError('INVALID', { path, message: `숨긴 ${label}은 새로 고를 수 없습니다` });
  }
};

/**
 * @description 직원 서비스 (앱 계정으로 자기 회사 범위에서만 조회·수정, 삭제하지 않고 상태만 바꿈)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param now 시계 (오늘 날짜 판정용)
 * @returns 직원 서비스
 */
export const createEmployeeService = (
  app: PrismaClient,
  now: Clock = () => new Date(),
): EmployeeService => ({
  list: (companyId, { status, jobTypeId, workerTypeId, q }) =>
    withCompany(app, companyId, async (tx) => {
      const rows = await tx.employee.findMany({
        where: {
          status,
          jobTypeId,
          workerTypeId,
          name: q ? { contains: q, mode: 'insensitive' } : undefined,
        },
      });

      return rows
        .sort(
          (a, b) =>
            EMPLOYEE_STATUSES.indexOf(a.status) - EMPLOYEE_STATUSES.indexOf(b.status) ||
            a.name.localeCompare(b.name, 'ko') ||
            a.id.localeCompare(b.id),
        )
        .map(toSummary);
    }),

  get: (companyId, id) =>
    withCompany(app, companyId, async (tx) => {
      // 다른 회사의 직원은 RLS 때문에 보이지 않아 없는 것과 같은 응답이 됨
      const row = await tx.employee.findFirst({ where: { id } });

      if (!row) {
        throw new EmployeeError('NOT_FOUND');
      }

      return toDetail(row);
    }),

  create: (companyId, input) =>
    withCompany(app, companyId, async (tx) => {
      const today = todayInSeoul(now());

      if ((await tx.employee.count()) >= EMPLOYEE_MAX_PER_COMPANY) {
        throw new EmployeeError('LIMIT');
      }

      await assertOption(tx, 'JOB_TYPE', 'body.jobTypeId', '직종', input.jobTypeId, null);
      await assertOption(
        tx,
        'WORKER_TYPE',
        'body.workerTypeId',
        '직원 구분',
        input.workerTypeId,
        null,
      );

      if (input.birthDate && input.birthDate > today) {
        throw new EmployeeError('INVALID', {
          path: 'body.birthDate',
          message: '생년월일은 오늘 이전이어야 합니다',
        });
      }

      return toDetail(
        await tx.employee.create({
          data: {
            companyId,
            name: input.name,
            title: input.title ?? null,
            jobTypeId: input.jobTypeId ?? null,
            workerTypeId: input.workerTypeId ?? null,
            status: input.status ?? 'ACTIVE',
            hiredOn: toDate(input.hiredOn) ?? null,
            birthDate: toDate(input.birthDate) ?? null,
            phone: input.phone ?? null,
            memo: input.memo || null,
          },
        }),
      );
    }),

  update: (companyId, id, input) =>
    withCompany(app, companyId, async (tx) => {
      const current = await tx.employee.findFirst({ where: { id } });

      if (!current) {
        throw new EmployeeError('NOT_FOUND');
      }

      const today = todayInSeoul(now());
      const resolved = resolveEmployeeStatus(
        { status: current.status, leftOn: fromDate(current.leftOn) },
        { status: input.status, leftOn: input.leftOn },
        today,
      );

      if (!resolved.ok) {
        throw new EmployeeError('INVALID', { path: 'body.leftOn', message: resolved.message });
      }

      await assertOption(
        tx,
        'JOB_TYPE',
        'body.jobTypeId',
        '직종',
        input.jobTypeId,
        current.jobTypeId,
      );
      await assertOption(
        tx,
        'WORKER_TYPE',
        'body.workerTypeId',
        '직원 구분',
        input.workerTypeId,
        current.workerTypeId,
      );

      if (input.birthDate && input.birthDate > today) {
        throw new EmployeeError('INVALID', {
          path: 'body.birthDate',
          message: '생년월일은 오늘 이전이어야 합니다',
        });
      }

      const hiredOn = input.hiredOn === undefined ? fromDate(current.hiredOn) : input.hiredOn;

      if (hiredOn && resolved.leftOn && resolved.leftOn < hiredOn) {
        throw new EmployeeError('INVALID', {
          path: 'body.leftOn',
          message: '퇴사일은 입사일보다 빠를 수 없습니다',
        });
      }

      return toDetail(
        await tx.employee.update({
          where: { companyId_id: { companyId, id } },
          data: {
            name: input.name,
            title: input.title,
            jobTypeId: input.jobTypeId,
            workerTypeId: input.workerTypeId,
            status: resolved.status,
            leftOn: toDate(resolved.leftOn),
            hiredOn: toDate(input.hiredOn),
            birthDate: toDate(input.birthDate),
            phone: input.phone,
            memo: input.memo === undefined ? undefined : input.memo || null,
          },
        }),
      );
    }),
});
