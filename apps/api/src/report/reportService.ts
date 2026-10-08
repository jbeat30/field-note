import {
  DEFAULT_COMPANY_SETTINGS,
  FILE_DOWNLOAD_URL_TTL_SECONDS,
  MATERIAL_RECORD_KIND_LABELS,
  REPORT_PHOTO_LIMIT,
  WORK_LOG_STATUS_LABELS,
  reportWorkUnitLabel,
  reportWorkValue,
  type DailyReport,
  type ReportExportQuery,
} from '@field-note/shared';
import ExcelJS from 'exceljs';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';
import type { ObjectStorage } from '../storage/objectStorage';

export class ReportError extends Error {
  constructor(readonly code: 'NOT_FOUND') {
    super(`[report.service] ${code}`);
  }
}

export type ReportFile = { filename: string; body: Buffer };

export type ReportService = {
  // 한 프로젝트의 하루 작업일보 (일지·인원·공수·자재·사진). 그날 일지가 없어도 자재·사진이 있으면 보고서가 만들어짐
  daily: (companyId: string, projectId: string, date: string) => Promise<DailyReport>;
  // 기간 안의 일지·공수·자재를 엑셀로 내보냄. 내보내기는 감사 기록으로 남는다 (서비스 기획서 §7.3)
  exportXlsx: (
    companyId: string,
    userId: string,
    projectId: string,
    range: ReportExportQuery,
  ) => Promise<ReportFile>;
};

const asDate = (value: string) => new Date(`${value}T00:00:00Z`);
const isoDate = (value: Date) => value.toISOString().slice(0, 10);

/**
 * @description 작업일보·엑셀 내보내기 서비스 (앱 계정으로 자기 회사 범위에서만 조회)
 * @param app 앱 계정 Prisma 클라이언트
 * @param storage 객체 저장소 (사진 썸네일 주소 발급용)
 * @param now 현재 시각
 * @returns 보고서 서비스
 */
export const createReportService = (
  app: PrismaClient,
  storage: ObjectStorage,
  now: () => Date = () => new Date(),
): ReportService => {
  const loadSettings = async (tx: Prisma.TransactionClient) => {
    const row = await tx.companySettings.findFirst();

    return {
      workUnitMode: row?.workUnitMode ?? DEFAULT_COMPANY_SETTINGS.workUnitMode,
      standardWorkMinutes: row?.standardWorkMinutes ?? DEFAULT_COMPANY_SETTINGS.standardWorkMinutes,
    };
  };

  const requireProject = async (tx: Prisma.TransactionClient, projectId: string) => {
    const project = await tx.project.findFirst({
      where: { id: projectId },
      include: { client: true },
    });

    if (!project) {
      throw new ReportError('NOT_FOUND');
    }

    return project;
  };

  return {
    daily: async (companyId, projectId, date) => {
      const data = await withCompany(app, companyId, async (tx) => {
        const project = await requireProject(tx, projectId);
        const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
        const settings = await loadSettings(tx);
        const workLog = await tx.workLog.findFirst({
          where: { projectId, workDate: asDate(date) },
          include: {
            entries: { include: { employee: { include: { jobType: true } }, category: true } },
          },
        });
        const records = await tx.materialRecord.findMany({
          where: { projectId, recordDate: asDate(date), deletedAt: null },
          include: { material: true, category: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        const photos = await tx.photo.findMany({
          // 검사에서 거부된 사진은 고객 제출용 보고서에 싣지 않음
          where: {
            projectId,
            workDate: asDate(date),
            deletedAt: null,
            file: { status: { not: 'REJECTED' } },
          },
          include: { file: true },
          orderBy: [{ takenAt: 'asc' }, { id: 'asc' }],
          take: REPORT_PHOTO_LIMIT + 1,
        });

        return { project, company, settings, workLog, records, photos };
      });
      const { project, company, settings, workLog, records, photos } = data;
      const entries = (workLog?.entries ?? [])
        .map((entry) => ({
          employeeId: entry.employeeId,
          employeeName: entry.employee.name,
          jobTypeName: entry.employee.jobType?.name ?? null,
          categoryName: entry.category.name,
          minutes: entry.minutes,
        }))
        .sort(
          (a, b) =>
            a.employeeName.localeCompare(b.employeeName, 'ko') ||
            a.categoryName.localeCompare(b.categoryName, 'ko'),
        );
      const shown = photos.slice(0, REPORT_PHOTO_LIMIT);

      return {
        companyName: company.name,
        project: {
          id: project.id,
          code: project.code,
          name: project.name,
          siteName: project.siteName,
          siteAddress: project.siteAddress,
          clientName: project.client.name,
        },
        date,
        workLog: workLog
          ? {
              status: workLog.status,
              content: workLog.content,
              area: workLog.area,
              notes: workLog.notes,
              isChange: workLog.isChange,
              isAfterService: workLog.isAfterService,
            }
          : null,
        entries,
        totals: {
          headcount: new Set(entries.map((entry) => entry.employeeId)).size,
          minutes: entries.reduce((sum, entry) => sum + entry.minutes, 0),
        },
        settings,
        materials: records.map((record) => ({
          materialName: record.material.name,
          spec: record.material.spec,
          unit: record.material.unit,
          kind: record.kind,
          quantity: Number(record.quantity),
          categoryName: record.category?.name ?? null,
          area: record.area,
          isChange: record.isChange,
          isAfterService: record.isAfterService,
          memo: record.memo,
        })),
        photos: await Promise.all(
          shown.map(async (photo) => ({
            id: photo.id,
            category: photo.category,
            area: photo.area,
            description: photo.description,
            takenAt: photo.takenAt.toISOString(),
            isProcessing: photo.file.status === 'PENDING' || photo.file.status === 'PROCESSING',
            thumbnailUrl:
              photo.file.status === 'READY' && photo.file.thumbnailKey
                ? await storage.presignDownload(photo.file.thumbnailKey, {
                    expiresInSeconds: FILE_DOWNLOAD_URL_TTL_SECONDS,
                  })
                : null,
          })),
        ),
        hasMorePhotos: photos.length > REPORT_PHOTO_LIMIT,
      } satisfies DailyReport;
    },

    exportXlsx: async (companyId, userId, projectId, { from, to }) => {
      const data = await withCompany(app, companyId, async (tx) => {
        const project = await requireProject(tx, projectId);
        const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
        const settings = await loadSettings(tx);
        const range = { gte: asDate(from), lte: asDate(to) };
        const workLogs = await tx.workLog.findMany({
          where: { projectId, workDate: range },
          include: {
            entries: { include: { employee: { include: { jobType: true } }, category: true } },
          },
          orderBy: [{ workDate: 'asc' }, { id: 'asc' }],
        });
        const records = await tx.materialRecord.findMany({
          where: { projectId, recordDate: range, deletedAt: null },
          include: { material: true, category: true },
          orderBy: [{ recordDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        });

        // 내보내기는 기록으로 남김 (데이터를 만든 같은 트랜잭션 안에서)
        await tx.auditLog.create({
          data: {
            companyId,
            action: 'REPORT_EXPORTED',
            actorId: userId,
            targetId: projectId,
            detail: {
              kind: 'DAILY_REPORT_XLSX',
              from,
              to,
              workLogs: workLogs.length,
              materialRecords: records.length,
            },
            createdAt: now(),
          },
        });

        return { project, company, settings, workLogs, records };
      });
      const { project, company, settings, workLogs, records } = data;
      const unit = reportWorkUnitLabel(settings.workUnitMode);
      const value = (minutes: number) => reportWorkValue(minutes, settings);
      const book = new ExcelJS.Workbook();

      book.creator = company.name;
      book.created = now();

      // 머리글 줄 꾸밈과 열 너비 (현장에서 휴대폰·PC로 바로 읽을 수 있게 첫 줄 고정)
      const style = (sheet: ExcelJS.Worksheet, widths: number[]) => {
        sheet.columns = widths.map((width) => ({ width }));
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
      };

      const summary = book.addWorksheet('요약');

      summary.addRow(['항목', '내용']);
      summary.addRows([
        ['회사', company.name],
        ['프로젝트', `${project.code} ${project.name}`],
        ['현장', project.siteName],
        ['고객', project.client.name],
        ['기간', `${from} ~ ${to}`],
        ['공수 단위', unit],
        ['일지 수', workLogs.length],
        ['자재 기록 수', records.length],
        ['내보낸 시각', now().toISOString()],
      ]);
      style(summary, [16, 48]);

      const logs = book.addWorksheet('작업일보');

      logs.addRow([
        '날짜',
        '상태',
        '작업 내용',
        '구역',
        '특이사항',
        '변경·추가 작업',
        '사후 작업',
        '인원',
        `공수 합계(${unit})`,
      ]);
      for (const log of workLogs) {
        const minutes = log.entries.reduce((sum, entry) => sum + entry.minutes, 0);

        logs.addRow([
          isoDate(log.workDate),
          WORK_LOG_STATUS_LABELS[log.status],
          log.content,
          log.area ?? '',
          log.notes ?? '',
          log.isChange ? 'O' : '',
          log.isAfterService ? 'O' : '',
          new Set(log.entries.map((entry) => entry.employeeId)).size,
          value(minutes),
        ]);
      }
      style(logs, [12, 10, 48, 16, 28, 14, 10, 8, 14]);
      logs.getColumn(3).alignment = { wrapText: true, vertical: 'top' };
      logs.getColumn(5).alignment = { wrapText: true, vertical: 'top' };

      const work = book.addWorksheet('공수');

      work.addRow(['날짜', '직원', '직종', '작업 구분', `공수(${unit})`]);
      for (const log of workLogs) {
        const sorted = [...log.entries].sort(
          (a, b) =>
            a.employee.name.localeCompare(b.employee.name, 'ko') ||
            a.category.name.localeCompare(b.category.name, 'ko'),
        );

        for (const entry of sorted) {
          work.addRow([
            isoDate(log.workDate),
            entry.employee.name,
            entry.employee.jobType?.name ?? '',
            entry.category.name,
            value(entry.minutes),
          ]);
        }
      }
      style(work, [12, 14, 12, 14, 12]);

      const materials = book.addWorksheet('자재');

      materials.addRow([
        '날짜',
        '자재',
        '규격',
        '구분',
        '수량',
        '단위',
        '작업 구분',
        '구역',
        '변경·추가 작업',
        '사후 작업',
        '메모',
      ]);
      for (const record of records) {
        materials.addRow([
          isoDate(record.recordDate),
          record.material.name,
          record.material.spec ?? '',
          MATERIAL_RECORD_KIND_LABELS[record.kind],
          Number(record.quantity),
          record.material.unit,
          record.category?.name ?? '',
          record.area ?? '',
          record.isChange ? 'O' : '',
          record.isAfterService ? 'O' : '',
          record.memo ?? '',
        ]);
      }
      style(materials, [12, 20, 14, 8, 10, 8, 14, 16, 14, 10, 24]);

      return {
        filename: `작업일보_${project.code}_${from}_${to}.xlsx`,
        body: Buffer.from(await book.xlsx.writeBuffer()),
      };
    },
  };
};
