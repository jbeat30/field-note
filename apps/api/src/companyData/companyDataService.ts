import {
  FILE_UPLOAD_URL_TTL_SECONDS,
  MATERIAL_RECORD_KIND_LABELS,
  PAY_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  type StorageUsage,
} from '@field-note/shared';
import ExcelJS from 'exceljs';

import type { AccountService, AuthenticatedAccount } from '../auth/accountService';
import type { PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class CompanyDataError extends Error {
  constructor(readonly code: 'PASSWORD_REQUIRED') {
    super(`[companyData.service] ${code}`);
  }
}

export type CompanyDataService = {
  // 저장 용량 현황 (용도별·프로젝트별 사용량과 한도)
  usage: (companyId: string) => Promise<StorageUsage>;
  // 회사 전체 데이터를 엑셀로 내보냄 (비밀번호 로그인 계정은 비밀번호 재확인, 내보낸 기록 저장)
  exportAll: (
    account: AuthenticatedAccount,
    currentPassword: string | undefined,
  ) => Promise<{ filename: string; body: Buffer }>;
};

type Deps = {
  // 회사 범위 밖 전용 계정 (비밀번호 로그인 여부 확인)
  auth: PrismaClient;
  app: PrismaClient;
  accountService: Pick<AccountService, 'verifyCurrentPassword'>;
  now?: () => Date;
};

const isoDate = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 10) : '');

/**
 * @description 회사 데이터 서비스 (앱 계정으로 자기 회사 범위에서만 조회): 저장 용량 현황과 해지 전 전체 데이터 내보내기
 * 내보내기는 직원 단가를 포함한 전체 데이터라 비밀번호 로그인 계정은 재확인 후에만 수행
 * @param deps 전용 계정·앱 계정·비밀번호 확인·현재 시각
 * @returns 회사 데이터 서비스
 */
export const createCompanyDataService = ({
  auth,
  app,
  accountService,
  now = () => new Date(),
}: Deps): CompanyDataService => ({
  usage: (companyId) =>
    withCompany(app, companyId, async (tx) => {
      const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
      // 용량 계산과 같은 기준: 검사 중·임시 보관·사용 가능 파일과 주소가 유효한 업로드 신청
      const where = {
        OR: [
          {
            status: {
              in: ['PROCESSING', 'STAGED', 'READY'] as ('PROCESSING' | 'STAGED' | 'READY')[],
            },
          },
          {
            status: 'PENDING' as const,
            createdAt: { gt: new Date(now().getTime() - FILE_UPLOAD_URL_TTL_SECONDS * 1000) },
          },
        ],
      };
      const [staged, byPurpose, byProject] = await Promise.all([
        tx.storedFile.aggregate({
          where: { status: 'STAGED' },
          _sum: { sizeBytes: true },
          _count: { _all: true },
        }),
        tx.storedFile.groupBy({
          by: ['purpose'],
          where,
          _sum: { sizeBytes: true },
          _count: { _all: true },
        }),
        tx.storedFile.groupBy({
          by: ['projectId'],
          where,
          _sum: { sizeBytes: true },
          _count: { _all: true },
        }),
      ]);
      const projects = await tx.project.findMany({
        where: { id: { in: byProject.flatMap((row) => (row.projectId ? [row.projectId] : [])) } },
        select: { id: true, name: true },
      });
      const names = new Map(projects.map((project) => [project.id, project.name]));

      return {
        quotaBytes: Number(company.storageQuotaBytes),
        usedBytes: byPurpose.reduce((sum, row) => sum + Number(row._sum.sizeBytes ?? 0n), 0),
        stagedBytes: Number(staged._sum.sizeBytes ?? 0n),
        stagedCount: staged._count._all,
        byPurpose: byPurpose.map((row) => ({
          purpose: row.purpose,
          bytes: Number(row._sum.sizeBytes ?? 0n),
          count: row._count._all,
        })),
        byProject: byProject
          .map((row) => ({
            projectId: row.projectId,
            name: row.projectId ? (names.get(row.projectId) ?? '(알 수 없음)') : '직원 서류',
            bytes: Number(row._sum.sizeBytes ?? 0n),
            count: row._count._all,
          }))
          .sort((a, b) => b.bytes - a.bytes),
      };
    }),

  exportAll: async (account, currentPassword) => {
    const credential = await auth.userCredential.findUnique({
      where: { companyId_userId: { companyId: account.companyId, userId: account.userId } },
    });

    // 비밀번호 로그인이 있으면 재확인 (계정 탈취 시 전체 데이터 반출 방지), 소셜 로그인만 쓰는 계정은 확인 수단 없음
    if (credential?.passwordHash) {
      if (!currentPassword) {
        throw new CompanyDataError('PASSWORD_REQUIRED');
      }

      await accountService.verifyCurrentPassword(account, currentPassword);
    }

    const at = now();
    const data = await withCompany(app, account.companyId, async (tx) => {
      const [company, projects, employees, partners, options] = await Promise.all([
        tx.company.findUniqueOrThrow({ where: { id: account.companyId } }),
        tx.project.findMany({ orderBy: { code: 'asc' } }),
        tx.employee.findMany({ orderBy: { name: 'asc' } }),
        tx.partner.findMany({ orderBy: { name: 'asc' } }),
        tx.optionItem.findMany(),
      ]);
      const [assignments, workLogs, materialRecords, ledger, changeWorks, repairs, memos] =
        await Promise.all([
          tx.projectAssignment.findMany({ orderBy: [{ projectId: 'asc' }, { startDate: 'asc' }] }),
          tx.workLog.findMany({
            include: { entries: true },
            orderBy: [{ projectId: 'asc' }, { workDate: 'asc' }],
          }),
          tx.materialRecord.findMany({
            where: { deletedAt: null },
            include: { material: true },
            orderBy: [{ projectId: 'asc' }, { recordDate: 'asc' }],
          }),
          tx.ledgerEntry.findMany({
            where: { deletedAt: null },
            orderBy: [{ projectId: 'asc' }, { entryDate: 'asc' }],
          }),
          tx.changeWork.findMany({ orderBy: [{ projectId: 'asc' }, { seq: 'asc' }] }),
          tx.repairRequest.findMany({ orderBy: [{ projectId: 'asc' }, { seq: 'asc' }] }),
          tx.memo.findMany({ where: { deletedAt: null }, orderBy: { memoDate: 'asc' } }),
        ]);
      const [payRates, warranties, files] = await Promise.all([
        tx.employeePayRate.findMany({ orderBy: [{ employeeId: 'asc' }, { effectiveFrom: 'asc' }] }),
        tx.projectWarranty.findMany(),
        tx.storedFile.findMany({
          where: { status: 'READY' },
          orderBy: [{ projectId: 'asc' }, { createdAt: 'asc' }],
        }),
      ]);

      // 내보내기는 기록으로 남김 (데이터를 읽은 같은 트랜잭션 안)
      await tx.auditLog.create({
        data: {
          companyId: account.companyId,
          action: 'REPORT_EXPORTED',
          actorId: account.userId,
          targetId: account.companyId,
          detail: { kind: 'COMPANY_DATA_XLSX', projects: projects.length },
          createdAt: at,
        },
      });

      return {
        company,
        projects,
        employees,
        partners,
        options,
        assignments,
        workLogs,
        materialRecords,
        ledger,
        changeWorks,
        repairs,
        memos,
        payRates,
        warranties,
        files,
      };
    });
    const optionName = new Map(data.options.map((item) => [item.id, item.name]));
    const partnerName = new Map(data.partners.map((item) => [item.id, item.name]));
    const employeeName = new Map(data.employees.map((item) => [item.id, item.name]));
    const projectLabel = new Map(
      data.projects.map((item) => [item.id, `${item.code} ${item.name}`]),
    );
    const book = new ExcelJS.Workbook();
    const sheet = (name: string, header: string[], widths: number[], rows: unknown[][]) => {
      const target = book.addWorksheet(name);

      target.addRow(header);
      target.addRows(rows as (string | number)[][]);
      target.columns = widths.map((width) => ({ width }));
      target.getRow(1).font = { bold: true };
      target.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      target.views = [{ state: 'frozen', ySplit: 1 }];
    };
    const project = (id: string | null) => (id ? (projectLabel.get(id) ?? '') : '');

    sheet(
      '안내',
      ['항목', '내용'],
      [20, 60],
      [
        ['회사', data.company.name],
        ['내보낸 시각', at.toISOString()],
        [
          '포함 내용',
          '프로젝트·직원·명부·투입·작업 내역(공수)·자재·지출·수입·변경 작업·보수 요청·메모·직원 단가·파일 목록',
        ],
        [
          '제외 내용',
          '사진·문서 파일 원본(파일 목록 시트에 이름과 크기 기재), 비밀번호·로그인 정보',
        ],
        ['주의', '직원 개인정보와 단가가 들어 있으므로 안전한 곳에 보관'],
      ],
    );
    sheet(
      '프로젝트',
      [
        '번호',
        '이름',
        '상태',
        '현장',
        '현장 주소',
        '고객',
        '담당자',
        '계약일',
        '예정 시작',
        '예정 종료',
        '실제 시작',
        '실제 종료',
        '메모',
      ],
      [10, 24, 10, 20, 28, 16, 12, 12, 12, 12, 12, 12, 30],
      data.projects.map((item) => [
        item.code,
        item.name,
        PROJECT_STATUS_LABELS[item.status],
        item.siteName,
        item.siteAddress ?? '',
        partnerName.get(item.clientId) ?? '',
        employeeName.get(item.managerId) ?? '',
        isoDate(item.contractDate),
        isoDate(item.plannedStart),
        isoDate(item.plannedEnd),
        isoDate(item.actualStart),
        isoDate(item.actualEnd),
        item.memo ?? '',
      ]),
    );
    sheet(
      '직원',
      ['이름', '직책', '직종', '구분', '상태', '입사일', '퇴사일', '생년월일', '연락처', '메모'],
      [12, 10, 12, 12, 8, 12, 12, 12, 16, 30],
      data.employees.map((item) => [
        item.name,
        item.title ?? '',
        item.jobTypeId ? (optionName.get(item.jobTypeId) ?? '') : '',
        item.workerTypeId ? (optionName.get(item.workerTypeId) ?? '') : '',
        item.status,
        isoDate(item.hiredOn),
        isoDate(item.leftOn),
        isoDate(item.birthDate),
        item.phone ?? '',
        item.memo ?? '',
      ]),
    );
    sheet(
      '명부',
      ['구분', '상호', '담당자', '연락처', '메모', '사용'],
      [10, 20, 12, 16, 30, 8],
      data.partners.map((item) => [
        item.kind,
        item.name,
        item.contactName ?? '',
        item.phone ?? '',
        item.memo ?? '',
        item.isActive ? 'O' : '숨김',
      ]),
    );
    sheet(
      '투입',
      ['프로젝트', '직원', '시작', '종료', '계획 공수(분)', '취소'],
      [28, 12, 12, 12, 14, 8],
      data.assignments.map((item) => [
        project(item.projectId),
        employeeName.get(item.employeeId) ?? '',
        isoDate(item.startDate),
        isoDate(item.endDate),
        item.plannedMinutes ?? '',
        item.cancelledAt ? 'O' : '',
      ]),
    );
    sheet(
      '작업 내역',
      [
        '날짜',
        '프로젝트',
        '직원',
        '작업 구분',
        '공수(분)',
        '상태',
        '작업 내용',
        '구역',
        '변경·추가',
        '사후 작업',
      ],
      [12, 28, 12, 14, 10, 10, 40, 14, 10, 10],
      data.workLogs.flatMap((log) =>
        log.entries.map((entry) => [
          isoDate(log.workDate),
          project(log.projectId),
          employeeName.get(entry.employeeId) ?? '',
          optionName.get(entry.categoryId) ?? '',
          entry.minutes,
          log.status === 'SAVED' ? '저장됨' : '임시 저장',
          log.content,
          log.area ?? '',
          log.isChange ? 'O' : '',
          log.isAfterService ? 'O' : '',
        ]),
      ),
    );
    sheet(
      '자재 기록',
      ['날짜', '프로젝트', '자재', '규격', '구분', '수량', '단위', '구역', '메모'],
      [12, 28, 20, 16, 8, 10, 8, 14, 30],
      data.materialRecords.map((item) => [
        isoDate(item.recordDate),
        project(item.projectId),
        item.material.name,
        item.material.spec ?? '',
        MATERIAL_RECORD_KIND_LABELS[item.kind],
        Number(item.quantity),
        item.material.unit,
        item.area ?? '',
        item.memo ?? '',
      ]),
    );
    sheet(
      '지출·수입',
      ['날짜', '프로젝트', '구분', '분류', '금액(원)', '거래처', '내용'],
      [12, 28, 8, 14, 14, 16, 30],
      data.ledger.map((item) => [
        isoDate(item.entryDate),
        project(item.projectId),
        item.kind === 'EXPENSE' ? '지출' : '수입',
        item.categoryId ? (optionName.get(item.categoryId) ?? '') : '',
        Number(item.amount),
        item.partnerId ? (partnerName.get(item.partnerId) ?? '') : '',
        item.content ?? '',
      ]),
    );
    sheet(
      '변경·추가 작업',
      ['프로젝트', '번호', '요청일', '요청자', '내용', '상태'],
      [28, 8, 12, 14, 40, 10],
      data.changeWorks.map((item) => [
        project(item.projectId),
        item.seq,
        isoDate(item.requestedOn),
        item.requester,
        item.content,
        item.status,
      ]),
    );
    sheet(
      '보증·보수',
      ['프로젝트', '구분', '번호·기간', '날짜', '내용', '상태'],
      [28, 10, 14, 12, 40, 10],
      [
        ...data.warranties.map((item) => [
          project(item.projectId),
          '보증',
          `${item.months}개월`,
          `${isoDate(item.startOn)} ~ ${isoDate(item.endOn)}`,
          '',
          '',
        ]),
        ...data.repairs.map((item) => [
          project(item.projectId),
          '보수 요청',
          `#${item.seq}`,
          isoDate(item.receivedOn),
          item.content,
          item.status,
        ]),
      ],
    );
    sheet(
      '메모',
      ['날짜', '프로젝트', '태그', '내용', '완료'],
      [12, 28, 8, 50, 8],
      data.memos.map((item) => [
        isoDate(item.memoDate),
        project(item.projectId),
        item.tag,
        item.content,
        item.doneAt ? 'O' : '',
      ]),
    );
    sheet(
      '직원 단가',
      ['직원', '종류', '금액(원)', '적용 시작일'],
      [12, 10, 14, 14],
      data.payRates.map((item) => [
        employeeName.get(item.employeeId) ?? '',
        PAY_TYPE_LABELS[item.payType],
        item.amount,
        isoDate(item.effectiveFrom),
      ]),
    );
    sheet(
      '파일 목록',
      ['프로젝트', '용도', '파일 이름', '크기(바이트)', '올린 날'],
      [28, 10, 36, 14, 12],
      data.files.map((item) => [
        project(item.projectId),
        item.purpose,
        item.originalName,
        Number(item.sizeBytes),
        isoDate(item.createdAt),
      ]),
    );

    return {
      filename: `전체데이터_${isoDate(at)}.xlsx`,
      body: Buffer.from(await book.xlsx.writeBuffer()),
    };
  },
});
