import {
  DEFAULT_COMPANY_SETTINGS,
  summarizeLaborCost,
  summarizePayRates,
  todayInSeoul,
  type LaborCost,
  type PayRate,
  type PayRateCreate,
  type PayRateSummary,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class LaborError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[labor.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type LaborService = {
  // 단가표: 단가가 있는 직원마다 현재·이전·적용 예정 단가
  listCurrent: (companyId: string) => Promise<PayRateSummary[]>;
  // 직원 단가 기록 (적용 시작일 최근순)
  listRates: (companyId: string, userId: string, employeeId: string) => Promise<PayRate[]>;
  // 단가 추가 (기존 단가는 수정 없음), 변경 기록 저장
  createRate: (
    companyId: string,
    userId: string,
    employeeId: string,
    input: PayRateCreate,
  ) => Promise<PayRate>;
  // 프로젝트 인건비 (최소 추정): 저장된 작업 내역의 공수 × 근무일 단가, 투입 계획 공수 × 단가
  projectCost: (companyId: string, userId: string, projectId: string) => Promise<LaborCost>;
};

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const fromDate = (value: Date) => value.toISOString().slice(0, 10);

const toRate = (row: Prisma.EmployeePayRateGetPayload<object>): PayRate => ({
  id: row.id,
  payType: row.payType,
  amount: row.amount,
  effectiveFrom: fromDate(row.effectiveFrom),
  createdAt: row.createdAt.toISOString(),
});

// 적용 시작일이 늦은 순, 같으면 나중에 입력한 것이 먼저
const NEWEST_FIRST = [
  { effectiveFrom: 'desc' as const },
  { createdAt: 'desc' as const },
  { id: 'desc' as const },
];

// 너무 먼 과거·미래 날짜는 입력 실수로 간주
const EARLIEST = '2000-01-01';
const MAX_FUTURE_DAYS = 366;

const addDays = (date: string, days: number) =>
  fromDate(new Date(toDate(date).getTime() + days * 86_400_000));

const clamp = (value: string, min: string, max: string) =>
  value < min ? min : value > max ? max : value;

/**
 * @description 단가·인건비 서비스 (앱 계정으로 자기 회사 범위에서만, 단가 기록은 추가만 가능, 조회·변경은 감사 기록)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param now 현재 시각 (시험에서 고정)
 * @returns 단가·인건비 서비스
 */
export const createLaborService = (
  app: PrismaClient,
  now: () => Date = () => new Date(),
): LaborService => ({
  listCurrent: (companyId) =>
    withCompany(app, companyId, async (tx) => {
      const today = todayInSeoul(now());
      const rows = await tx.employeePayRate.findMany({ orderBy: NEWEST_FIRST });
      const byEmployee = new Map<string, PayRate[]>();

      for (const row of rows) {
        byEmployee.set(row.employeeId, [...(byEmployee.get(row.employeeId) ?? []), toRate(row)]);
      }

      return [...byEmployee.entries()].map(([employeeId, rates]) => ({
        employeeId,
        ...summarizePayRates(rates, today),
      }));
    }),

  listRates: (companyId, userId, employeeId) =>
    withCompany(app, companyId, async (tx) => {
      if (!(await tx.employee.findFirst({ where: { id: employeeId }, select: { id: true } }))) {
        throw new LaborError('NOT_FOUND');
      }

      return (
        await tx.employeePayRate.findMany({ where: { employeeId }, orderBy: NEWEST_FIRST })
      ).map(toRate);
    }),

  createRate: (companyId, userId, employeeId, input) =>
    withCompany(app, companyId, async (tx) => {
      if (!(await tx.employee.findFirst({ where: { id: employeeId }, select: { id: true } }))) {
        throw new LaborError('NOT_FOUND');
      }

      const today = todayInSeoul(now());

      if (input.effectiveFrom < EARLIEST || input.effectiveFrom > addDays(today, MAX_FUTURE_DAYS)) {
        throw new LaborError('INVALID', {
          path: 'body.effectiveFrom',
          message: '적용 시작일이 너무 먼 날짜입니다',
        });
      }

      const row = await tx.employeePayRate.create({
        data: {
          companyId,
          employeeId,
          payType: input.payType,
          amount: input.amount,
          effectiveFrom: toDate(input.effectiveFrom),
          createdBy: userId,
        },
      });

      // 금액 자체는 기록에 복사하지 않는다 (단가표에 이미 있고, 감사 기록은 누가 언제 무엇을 바꿨는지만)
      await tx.auditLog.create({
        data: {
          companyId,
          action: 'PAY_RATE_CHANGED',
          actorId: userId,
          targetId: employeeId,
          detail: { payType: input.payType, effectiveFrom: input.effectiveFrom },
          createdAt: now(),
        },
      });

      return toRate(row);
    }),

  projectCost: (companyId, userId, projectId) =>
    withCompany(app, companyId, async (tx) => {
      if (!(await tx.project.findFirst({ where: { id: projectId }, select: { id: true } }))) {
        throw new LaborError('NOT_FOUND');
      }

      const [settings, entries, assignments] = await Promise.all([
        tx.companySettings.findFirst(),
        tx.workLogEntry.findMany({
          where: { workLog: { projectId, status: 'SAVED' } },
          select: { employeeId: true, minutes: true, workLog: { select: { workDate: true } } },
        }),
        tx.projectAssignment.findMany({
          where: { projectId, cancelledAt: null, plannedMinutes: { not: null } },
          select: { employeeId: true, plannedMinutes: true, startDate: true, endDate: true },
        }),
      ]);
      const units = settings ?? DEFAULT_COMPANY_SETTINGS;
      const today = todayInSeoul(now());
      const employeeIds = [...new Set([...entries, ...assignments].map((item) => item.employeeId))];
      const rateRows = await tx.employeePayRate.findMany({
        where: { employeeId: { in: employeeIds } },
      });
      const ratesByEmployee = new Map<
        string,
        { payType: PayRate['payType']; amount: number; effectiveFrom: string; createdAt: string }[]
      >();

      for (const row of rateRows) {
        const list = ratesByEmployee.get(row.employeeId) ?? [];

        list.push({
          payType: row.payType,
          amount: row.amount,
          effectiveFrom: fromDate(row.effectiveFrom),
          createdAt: row.createdAt.toISOString(),
        });
        ratesByEmployee.set(row.employeeId, list);
      }

      return {
        actual: summarizeLaborCost(
          entries.map((entry) => ({
            employeeId: entry.employeeId,
            date: fromDate(entry.workLog.workDate),
            minutes: entry.minutes,
          })),
          ratesByEmployee,
          units,
        ),
        // 계획 공수는 기간 전체의 총량이므로 오늘(투입 기간 안으로 보정) 단가로 환산
        planned: summarizeLaborCost(
          assignments.map((assignment) => ({
            employeeId: assignment.employeeId,
            date: clamp(today, fromDate(assignment.startDate), fromDate(assignment.endDate)),
            minutes: assignment.plannedMinutes!,
          })),
          ratesByEmployee,
          units,
        ),
      };
    }),
});
