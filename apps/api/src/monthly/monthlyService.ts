import {
  DEFAULT_COMPANY_SETTINGS,
  MONTHLY_DRAFT_LIMIT,
  monthLockCheck,
  monthOf,
  monthRange,
  monthlyWorkValue,
  summarizeMonthlyHours,
  todayInSeoul,
  validateMonthClose,
  type MonthlyClose,
  type MonthlyHours,
  type MonthlyHoursRow,
  type MonthlyReopen,
} from '@field-note/shared';
import ExcelJS from 'exceljs';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class MonthlyError extends Error {
  constructor(
    readonly code: 'INVALID',
    // 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail: { path: string; message: string },
  ) {
    super(`[monthly.service] ${code} ${detail.path}`);
  }
}

export type MonthlyFile = { filename: string; body: Buffer };

export type MonthlyService = {
  // 월 공수표: 프로젝트 × 직원별 저장된 작업 내역 공수, 확정 상태·확정 당시 기준값·임시 저장 작업 내역·이력
  get: (companyId: string, month: string) => Promise<MonthlyHours>;
  // 월 공수 확정 (이번 달까지, 임시 저장 작업 내역이 남아 있으면 확인 필요), 해당 월의 작업 내역은 재오픈 전까지 수정 불가
  close: (companyId: string, userId: string, input: MonthlyClose) => Promise<MonthlyHours>;
  // 재오픈 (사유 필수, 이력에 남음)
  reopen: (companyId: string, userId: string, input: MonthlyReopen) => Promise<MonthlyHours>;
  // 월 공수표 엑셀 내보내기, 급여·정산 담당 전달용이며 내보내기는 감사 기록 저장 (서비스 기획서 §7.3)
  exportXlsx: (companyId: string, userId: string, month: string) => Promise<MonthlyFile>;
};

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

const invalid = (path: string, message: string) => new MonthlyError('INVALID', { path, message });

// 같은 회사·월에 대한 확정과 작업 내역 저장을 한 줄로 세워 확정 직전에 끼어드는 저장이 없게 함
const lockMonth = async (tx: Prisma.TransactionClient, companyId: string, month: string) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`monthly:${companyId}:${month}`}))`;
};

/**
 * @description 이 날짜의 작업 내역을 고칠 수 있는지 확인 (확정된 달은 재오픈 필요), 확정 처리와 같은 잠금 사용
 * @param tx 회사 범위 트랜잭션
 * @param companyId 회사
 * @param workDate 작업 일자
 * @throws 확정된 달이면 사유와 함께
 */
export const assertMonthOpen = async (
  tx: Prisma.TransactionClient,
  companyId: string,
  workDate: string,
) => {
  const month = monthOf(workDate);

  await lockMonth(tx, companyId, month);

  const closed = await tx.monthlyClose.findFirst({
    where: { month: toDate(`${month}-01`), isClosed: true },
    select: { month: true },
  });
  const checked = monthLockCheck(workDate, closed ? [month] : []);

  if (!checked.ok) {
    throw new MonthlyError('INVALID', { path: checked.path, message: checked.message });
  }
};

/**
 * @description 월 공수 확정 서비스 (앱 계정으로 자기 회사 범위에서만, 확정·재오픈은 이력으로 남음)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param now 현재 시각 (시험에서 고정)
 * @returns 월 공수 서비스
 */
export const createMonthlyService = (
  app: PrismaClient,
  now: () => Date = () => new Date(),
): MonthlyService => {
  const currentSettings = async (tx: Prisma.TransactionClient) => {
    const row = await tx.companySettings.findFirst();

    return {
      standardWorkMinutes: row?.standardWorkMinutes ?? DEFAULT_COMPANY_SETTINGS.standardWorkMinutes,
      monthlyWorkDays: row?.monthlyWorkDays ?? DEFAULT_COMPANY_SETTINGS.monthlyWorkDays,
      workUnitMode: row?.workUnitMode ?? DEFAULT_COMPANY_SETTINGS.workUnitMode,
    };
  };

  const draftsOf = async (tx: Prisma.TransactionClient, month: string) => {
    const { from, to } = monthRange(month);
    const where = { status: 'DRAFT' as const, workDate: { gte: toDate(from), lte: toDate(to) } };
    const [count, rows] = await Promise.all([
      tx.workLog.count({ where }),
      tx.workLog.findMany({
        where,
        include: { project: { select: { name: true } } },
        orderBy: [{ workDate: 'asc' }, { id: 'asc' }],
        take: MONTHLY_DRAFT_LIMIT,
      }),
    ]);

    return {
      count,
      list: rows.map((row) => ({
        projectId: row.projectId,
        projectName: row.project.name,
        workDate: row.workDate.toISOString().slice(0, 10),
      })),
    };
  };

  const rowsOf = async (
    tx: Prisma.TransactionClient,
    month: string,
  ): Promise<MonthlyHoursRow[]> => {
    const { from, to } = monthRange(month);
    // 집계에는 저장된 작업 내역만 씀 (임시 저장은 제외, §9.4)
    const entries = await tx.workLogEntry.findMany({
      where: { workLog: { status: 'SAVED', workDate: { gte: toDate(from), lte: toDate(to) } } },
      select: { employeeId: true, minutes: true, workLog: { select: { projectId: true } } },
    });
    const sums = new Map<string, { projectId: string; employeeId: string; minutes: number }>();

    for (const entry of entries) {
      const key = `${entry.workLog.projectId}:${entry.employeeId}`;
      const current = sums.get(key);

      sums.set(key, {
        projectId: entry.workLog.projectId,
        employeeId: entry.employeeId,
        minutes: (current?.minutes ?? 0) + entry.minutes,
      });
    }

    const [projects, employees] = await Promise.all([
      tx.project.findMany({
        where: { id: { in: [...new Set([...sums.values()].map((item) => item.projectId))] } },
        select: { id: true, code: true, name: true },
      }),
      tx.employee.findMany({
        where: { id: { in: [...new Set([...sums.values()].map((item) => item.employeeId))] } },
        select: { id: true, name: true },
      }),
    ]);

    return [...sums.values()]
      .flatMap((item) => {
        const project = projects.find((candidate) => candidate.id === item.projectId);
        const employee = employees.find((candidate) => candidate.id === item.employeeId);

        return project && employee
          ? [
              {
                projectId: item.projectId,
                projectCode: project.code,
                projectName: project.name,
                employeeId: item.employeeId,
                employeeName: employee.name,
                minutes: item.minutes,
              },
            ]
          : [];
      })
      .sort(
        (a, b) =>
          a.projectCode.localeCompare(b.projectCode) ||
          a.employeeName.localeCompare(b.employeeName, 'ko') ||
          a.employeeId.localeCompare(b.employeeId),
      );
  };

  const load = async (tx: Prisma.TransactionClient, month: string): Promise<MonthlyHours> => {
    const [state, settings, drafts, rows, events] = await Promise.all([
      tx.monthlyClose.findFirst({ where: { month: toDate(`${month}-01`) } }),
      currentSettings(tx),
      draftsOf(tx, month),
      rowsOf(tx, month),
      tx.monthlyCloseEvent.findMany({
        where: { month: toDate(`${month}-01`) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    const closed = state?.isClosed === true;

    return {
      month,
      isClosed: closed,
      closedAt: closed && state.closedAt ? state.closedAt.toISOString() : null,
      // 확정된 달은 확정 당시 값으로 고정
      standardWorkMinutes: closed ? state.standardWorkMinutes : settings.standardWorkMinutes,
      monthlyWorkDays: closed ? state.monthlyWorkDays : settings.monthlyWorkDays,
      workUnitMode: settings.workUnitMode,
      draftLogCount: drafts.count,
      drafts: drafts.list,
      rows,
      events: events.map((event) => ({
        id: event.id,
        kind: event.kind,
        reason: event.reason,
        draftLogCount: event.draftLogCount,
        standardWorkMinutes: event.standardWorkMinutes,
        monthlyWorkDays: event.monthlyWorkDays,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  };

  return {
    get: (companyId, month) => withCompany(app, companyId, (tx) => load(tx, month)),

    close: (companyId, userId, input) =>
      withCompany(app, companyId, async (tx) => {
        await lockMonth(tx, companyId, input.month);

        const state = await tx.monthlyClose.findFirst({
          where: { month: toDate(`${input.month}-01`) },
        });
        const drafts = await draftsOf(tx, input.month);
        const checked = validateMonthClose({
          month: input.month,
          today: todayInSeoul(now()),
          isClosed: state?.isClosed === true,
          draftLogCount: drafts.count,
          confirmDrafts: input.confirmDrafts === true,
        });

        if (!checked.ok) {
          throw invalid(`body.${checked.path}`, checked.message);
        }

        const settings = await currentSettings(tx);
        const at = now();
        const data = {
          isClosed: true,
          standardWorkMinutes: settings.standardWorkMinutes,
          monthlyWorkDays: settings.monthlyWorkDays,
          closedAt: at,
          closedBy: userId,
        };

        if (state) {
          await tx.monthlyClose.update({
            where: { companyId_month: { companyId, month: state.month } },
            data: { ...data, updatedAt: at },
          });
        } else {
          await tx.monthlyClose.create({
            data: { companyId, month: toDate(`${input.month}-01`), ...data },
          });
        }

        await tx.monthlyCloseEvent.create({
          data: {
            companyId,
            month: toDate(`${input.month}-01`),
            kind: 'CLOSED',
            reason: null,
            draftLogCount: drafts.count,
            standardWorkMinutes: settings.standardWorkMinutes,
            monthlyWorkDays: settings.monthlyWorkDays,
            createdBy: userId,
            createdAt: at,
          },
        });
        // 확정은 감사 기록으로도 남겨 기록 조회 화면에서 한꺼번에 봄 (대상은 회사)
        await tx.auditLog.create({
          data: {
            companyId,
            action: 'MONTH_CLOSED',
            actorId: userId,
            targetId: companyId,
            detail: { month: input.month, draftLogCount: drafts.count },
            createdAt: at,
          },
        });

        return load(tx, input.month);
      }),

    reopen: (companyId, userId, input) =>
      withCompany(app, companyId, async (tx) => {
        await lockMonth(tx, companyId, input.month);

        const state = await tx.monthlyClose.findFirst({
          where: { month: toDate(`${input.month}-01`) },
        });

        if (!state?.isClosed) {
          throw invalid('body.month', '확정하지 않은 달입니다');
        }

        const drafts = await draftsOf(tx, input.month);
        const at = now();

        await tx.monthlyClose.update({
          where: { companyId_month: { companyId, month: state.month } },
          data: { isClosed: false, updatedAt: at },
        });
        await tx.monthlyCloseEvent.create({
          data: {
            companyId,
            month: state.month,
            kind: 'REOPENED',
            reason: input.reason.trim(),
            draftLogCount: drafts.count,
            standardWorkMinutes: state.standardWorkMinutes,
            monthlyWorkDays: state.monthlyWorkDays,
            createdBy: userId,
            createdAt: at,
          },
        });

        await tx.auditLog.create({
          data: {
            companyId,
            action: 'MONTH_REOPENED',
            actorId: userId,
            targetId: companyId,
            detail: { month: input.month, reason: input.reason.trim() },
            createdAt: at,
          },
        });

        return load(tx, input.month);
      }),

    exportXlsx: async (companyId, userId, month) => {
      const { data, company } = await withCompany(app, companyId, async (tx) => {
        const data = await load(tx, month);
        const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });

        // 내보내기 기록 저장 (데이터를 만든 같은 트랜잭션 안), 대상은 회사 단위이므로 회사 id를 대상으로 지정
        await tx.auditLog.create({
          data: {
            companyId,
            action: 'REPORT_EXPORTED',
            actorId: userId,
            targetId: companyId,
            detail: {
              kind: 'MONTHLY_HOURS_XLSX',
              month,
              rows: data.rows.length,
              isClosed: data.isClosed,
            },
            createdAt: now(),
          },
        });

        return { data, company };
      });
      const settings = {
        standardWorkMinutes: data.standardWorkMinutes,
        monthlyWorkDays: data.monthlyWorkDays,
      };
      const summary = summarizeMonthlyHours(data.rows);
      const book = new ExcelJS.Workbook();

      book.creator = company.name;
      book.created = now();

      // 머리글 줄 꾸밈과 열 너비 (첫 줄 고정)
      const style = (sheet: ExcelJS.Worksheet, widths: number[]) => {
        sheet.columns = widths.map((width) => ({ width }));
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
      };
      const sheetOf = (name: string, widths: number[], header: string[]) => {
        const sheet = book.addWorksheet(name);

        sheet.addRow(header);
        style(sheet, widths);

        return sheet;
      };
      const total = monthlyWorkValue(summary.total, settings);
      const info = sheetOf('요약', [24, 40], ['항목', '내용']);

      info.addRows([
        ['회사', company.name],
        ['월', month],
        ['확정 상태', data.isClosed ? '확정' : '미확정 (현재 저장된 기록 기준)'],
        ['확정 일시', data.closedAt ?? '-'],
        ['하루 기준시간(분)', data.standardWorkMinutes],
        ['월 기준일수', data.monthlyWorkDays],
        ['임시 저장 작업 내역(건)', data.draftLogCount],
        ['총 공수(MD)', total.manDays],
        ['총 공수(MM)', total.manMonths],
      ]);

      const rows = sheetOf(
        '월 공수표',
        [14, 26, 16, 12, 12],
        ['프로젝트 코드', '프로젝트', '직원', '공수(MD)', 'MM'],
      );

      for (const row of data.rows) {
        const value = monthlyWorkValue(row.minutes, settings);

        rows.addRow([
          row.projectCode,
          row.projectName,
          row.employeeName,
          value.manDays,
          value.manMonths,
        ]);
      }

      const byEmployee = sheetOf('직원별 합계', [16, 12, 12], ['직원', '공수(MD)', 'MM']);

      for (const item of summary.byEmployee) {
        const value = monthlyWorkValue(item.minutes, settings);

        byEmployee.addRow([item.name, value.manDays, value.manMonths]);
      }

      const byProject = sheetOf('프로젝트별 합계', [32, 12, 12], ['프로젝트', '공수(MD)', 'MM']);

      for (const item of summary.byProject) {
        const value = monthlyWorkValue(item.minutes, settings);

        byProject.addRow([item.name, value.manDays, value.manMonths]);
      }

      const body = Buffer.from(await book.xlsx.writeBuffer());

      return { filename: `월공수표_${month}.xlsx`, body };
    },
  };
};
