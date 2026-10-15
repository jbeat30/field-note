import {
  CHANGE_WORK_STATUS_LABELS,
  DEFAULT_COMPANY_SETTINGS,
  FILE_DOWNLOAD_URL_TTL_SECONDS,
  PROJECT_STATUS_LABELS,
  reportWorkUnitLabel,
  reportWorkValue,
  selectSummaryDocuments,
  selectSummaryPhotos,
  evaluateTransitionNotices,
  summarizeMaterialBalance,
  todayInSeoul,
  type ProjectCompletionSummary,
  type ProjectStatus,
  type TransitionNotices,
} from '@field-note/shared';

import ExcelJS from 'exceljs';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';
import { loadRepairCounts } from '../repair/repairService';
import type { ObjectStorage } from '../storage/objectStorage';

export class CompletionError extends Error {
  constructor(readonly code: 'NOT_FOUND') {
    super(`[completion.service] ${code}`);
  }
}

export type CompletionService = {
  // 이 전환에서 확인할 것 (임시 저장 작업 내역·진행률·남은 자재·협의 중 변경 작업·종료 예정일 경과). 막지 않고 알려 줌
  notices: (companyId: string, projectId: string, to: ProjectStatus) => Promise<TransitionNotices>;
  // 프로젝트 요약(완료 리포트): 그때그때 최신 기록으로 만든다. 금액과 민감 문서는 싣지 않음
  summary: (companyId: string, projectId: string) => Promise<ProjectCompletionSummary>;
  // 요약을 엑셀로 내보냄 (요약과 같은 내용, 금액·민감 문서 제외). 내보낸 기록이 남는다
  exportXlsx: (
    companyId: string,
    userId: string,
    projectId: string,
  ) => Promise<{ filename: string; body: Buffer }>;
};

const fromDate = (value: Date) => value.toISOString().slice(0, 10);

// 같은 기준일이면 나중에 입력한 기록이 현재 값
const LATEST_FIRST = [
  { recordedOn: 'desc' as const },
  { createdAt: 'desc' as const },
  { id: 'desc' as const },
];

/**
 * @description 상태 전환 안내·프로젝트 요약 서비스 (앱 계정으로 자기 회사 범위에서만 조회, 아무것도 저장하지 않음)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param storage 객체 저장소 (대표 사진 썸네일 주소 발급용)
 * @param now 현재 시각 (시험에서 고정)
 * @returns 상태 전환 안내·프로젝트 요약 서비스
 */
export const createCompletionService = (
  app: PrismaClient,
  storage: ObjectStorage,
  now: () => Date = () => new Date(),
): CompletionService => {
  const requireProject = async (tx: Prisma.TransactionClient, projectId: string) => {
    const project = await tx.project.findFirst({
      where: { id: projectId },
      include: { client: true, manager: true },
    });

    if (!project) {
      throw new CompletionError('NOT_FOUND');
    }

    return project;
  };

  const balanceOf = async (tx: Prisma.TransactionClient, projectId: string) => {
    const rows = await tx.materialRecord.findMany({
      where: { projectId, deletedAt: null },
      select: {
        materialId: true,
        kind: true,
        quantity: true,
        isChange: true,
        isAfterService: true,
      },
    });
    const materials = await tx.material.findMany({
      where: { id: { in: [...new Set(rows.map((row) => row.materialId))] } },
    });

    return summarizeMaterialBalance(
      rows.map((row) => ({ ...row, quantity: Number(row.quantity) })),
      materials,
    );
  };

  const service: CompletionService = {
    notices: (companyId, projectId, to) =>
      withCompany(app, companyId, async (tx) => {
        const project = await requireProject(tx, projectId);
        const [draftLogCount, latest, materials, negotiatingCount, repairs] = await Promise.all([
          tx.workLog.count({ where: { projectId, status: 'DRAFT' } }),
          tx.projectProgressRecord.findFirst({ where: { projectId }, orderBy: LATEST_FIRST }),
          balanceOf(tx, projectId),
          tx.changeWork.count({ where: { projectId, status: 'NEGOTIATING' } }),
          to === 'CLOSED' ? loadRepairCounts(tx, projectId) : { open: 0, hold: 0 },
        ]);

        return {
          items: evaluateTransitionNotices({
            from: project.status,
            to,
            draftLogCount,
            progressPercent: latest?.percent ?? null,
            materials: materials.map((item) => ({
              materialId: item.materialId,
              name: item.name,
              spec: item.spec,
              unit: item.unit,
              remaining: item.remaining,
            })),
            negotiatingCount,
            openRepairCount: repairs.open,
            holdRepairCount: repairs.hold,
            plannedEnd: fromDate(project.plannedEnd),
            today: todayInSeoul(now()),
          }),
        };
      }),

    summary: async (companyId, projectId) => {
      const data = await withCompany(app, companyId, async (tx) => {
        const project = await requireProject(tx, projectId);
        const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
        const settings = await tx.companySettings.findFirst();
        const [latest, logs, assignments, materials, changeWorks, photoTotal, photos, documents] =
          await Promise.all([
            tx.projectProgressRecord.findFirst({ where: { projectId }, orderBy: LATEST_FIRST }),
            tx.workLog.findMany({
              where: { projectId, status: 'SAVED' },
              include: { entries: { include: { employee: true, category: true } } },
            }),
            tx.projectAssignment.findMany({
              where: { projectId, cancelledAt: null },
              select: { plannedMinutes: true },
            }),
            balanceOf(tx, projectId),
            tx.changeWork.findMany({ where: { projectId }, orderBy: { seq: 'asc' } }),
            tx.photo.count({
              where: { projectId, deletedAt: null, file: { status: { not: 'REJECTED' } } },
            }),
            tx.photo.findMany({
              where: { projectId, deletedAt: null, file: { status: 'READY' } },
              include: { file: true },
            }),
            tx.document.findMany({
              where: { projectId, deletedAt: null },
              include: { versions: { select: { revisionDate: true } } },
              orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            }),
          ]);

        return {
          project,
          company,
          settings,
          latest,
          logs,
          assignments,
          materials,
          changeWorks,
          photoTotal,
          photos,
          documents,
        };
      });
      const { project, company, settings, latest, logs, assignments, materials, changeWorks } =
        data;
      const entries = logs.flatMap((log) =>
        log.entries.map((entry) => ({ ...entry, workDate: fromDate(log.workDate) })),
      );
      const byEmployee = new Map<string, { name: string; days: Set<string>; minutes: number }>();
      const byCategory = new Map<string, number>();

      for (const entry of entries) {
        const row = byEmployee.get(entry.employeeId) ?? {
          name: entry.employee.name,
          days: new Set<string>(),
          minutes: 0,
        };

        row.days.add(entry.workDate);
        row.minutes += entry.minutes;
        byEmployee.set(entry.employeeId, row);
        byCategory.set(
          entry.category.name,
          (byCategory.get(entry.category.name) ?? 0) + entry.minutes,
        );
      }

      const planned = assignments.flatMap((item) =>
        item.plannedMinutes === null ? [] : [item.plannedMinutes],
      );
      const sumOf = (flag: 'isChange' | 'isAfterService') => {
        const flagged = logs.filter((log) => log[flag]);

        return {
          workLogCount: flagged.length,
          minutes: flagged
            .flatMap((log) => log.entries)
            .reduce((sum, entry) => sum + entry.minutes, 0),
        };
      };
      const sensitive = data.documents.filter((document) => document.isSensitive);
      const photoIds = new Set(
        selectSummaryPhotos(
          data.photos.map((photo) => ({
            id: photo.id,
            category: photo.category,
            takenAt: photo.takenAt.toISOString(),
            includeInSummary: photo.includeInSummary,
          })),
        ),
      );
      // 고른 사진을 최근 촬영순으로
      const summaryPhotos = data.photos
        .filter((photo) => photoIds.has(photo.id))
        .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime() || b.id.localeCompare(a.id));
      const documentIds = new Set(selectSummaryDocuments(data.documents));
      const change = sumOf('isChange');
      const after = sumOf('isAfterService');

      return {
        generatedOn: todayInSeoul(now()),
        companyName: company.name,
        project: {
          id: project.id,
          code: project.code,
          name: project.name,
          status: project.status,
          siteName: project.siteName,
          siteAddress: project.siteAddress,
          clientName: project.client.name,
          managerName: project.manager.name,
          contractDate: fromDate(project.contractDate),
          plannedStart: fromDate(project.plannedStart),
          plannedEnd: fromDate(project.plannedEnd),
          actualStart: project.actualStart ? fromDate(project.actualStart) : null,
          actualEnd: project.actualEnd ? fromDate(project.actualEnd) : null,
        },
        progressPercent: latest?.percent ?? null,
        settings: {
          workUnitMode: settings?.workUnitMode ?? DEFAULT_COMPANY_SETTINGS.workUnitMode,
          standardWorkMinutes:
            settings?.standardWorkMinutes ?? DEFAULT_COMPANY_SETTINGS.standardWorkMinutes,
          monthlyWorkDays: settings?.monthlyWorkDays ?? DEFAULT_COMPANY_SETTINGS.monthlyWorkDays,
        },
        work: {
          totalMinutes: entries.reduce((sum, entry) => sum + entry.minutes, 0),
          plannedMinutes:
            planned.length > 0 ? planned.reduce((sum, value) => sum + value, 0) : null,
          workedDays: new Set(logs.map((log) => fromDate(log.workDate))).size,
          savedLogCount: logs.length,
          byEmployee: [...byEmployee.entries()]
            .map(([employeeId, row]) => ({
              employeeId,
              name: row.name,
              workedDays: row.days.size,
              minutes: row.minutes,
            }))
            .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'ko')),
          byCategory: [...byCategory.entries()]
            .map(([categoryName, minutes]) => ({ categoryName, minutes }))
            .sort(
              (a, b) => b.minutes - a.minutes || a.categoryName.localeCompare(b.categoryName, 'ko'),
            ),
        },
        materials,
        changeWorks: {
          items: changeWorks.map((item) => ({
            seq: item.seq,
            requestedOn: fromDate(item.requestedOn),
            requester: item.requester,
            content: item.content,
            status: item.status,
          })),
          minutes: change.minutes,
          workLogCount: change.workLogCount,
        },
        afterService: { minutes: after.minutes, workLogCount: after.workLogCount },
        photos: {
          total: data.photoTotal,
          items: await Promise.all(
            summaryPhotos.map(async (photo) => ({
              id: photo.id,
              category: photo.category,
              area: photo.area,
              description: photo.description,
              takenAt: photo.takenAt.toISOString(),
              thumbnailUrl: photo.file.thumbnailKey
                ? await storage.presignDownload(photo.file.thumbnailKey, {
                    expiresInSeconds: FILE_DOWNLOAD_URL_TTL_SECONDS,
                  })
                : null,
            })),
          ),
        },
        documents: {
          sensitiveExcluded: sensitive.length,
          items: data.documents
            .filter((document) => documentIds.has(document.id) && document.versions.length > 0)
            .map((document) => ({
              id: document.id,
              title: document.title,
              category: document.category,
              versionCount: document.versions.length,
              latestRevisionDate: fromDate(
                document.versions
                  .map((version) => version.revisionDate)
                  .reduce((latestDate, date) => (date > latestDate ? date : latestDate)),
              ),
            })),
        },
      } satisfies ProjectCompletionSummary;
    },

    exportXlsx: async (companyId, userId, projectId) => {
      const summary = await service.summary(companyId, projectId);
      const unit = reportWorkUnitLabel(summary.settings.workUnitMode);
      const value = (minutes: number) => reportWorkValue(minutes, summary.settings);
      const book = new ExcelJS.Workbook();
      const sheet = (
        name: string,
        header: string[],
        widths: number[],
        rows: (string | number)[][],
      ) => {
        const target = book.addWorksheet(name);

        target.addRow(header);
        target.addRows(rows);
        target.columns = widths.map((width) => ({ width }));
        target.getRow(1).font = { bold: true };
        target.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8F0' },
        };
        target.views = [{ state: 'frozen', ySplit: 1 }];
      };
      const project = summary.project;

      sheet(
        '요약',
        ['항목', '내용'],
        [18, 48],
        [
          ['회사', summary.companyName],
          ['프로젝트', `${project.code} ${project.name}`],
          ['상태', PROJECT_STATUS_LABELS[project.status]],
          ['현장', project.siteName],
          ['현장 주소', project.siteAddress ?? ''],
          ['고객', project.clientName],
          ['담당자', project.managerName],
          ['계약일', project.contractDate],
          ['예정 기간', `${project.plannedStart} ~ ${project.plannedEnd}`],
          ['실제 기간', `${project.actualStart ?? ''} ~ ${project.actualEnd ?? ''}`],
          ['진행률(%)', summary.progressPercent ?? ''],
          [`총 공수 (${unit})`, value(summary.work.totalMinutes)],
          [
            `계획 공수 (${unit})`,
            summary.work.plannedMinutes === null ? '' : value(summary.work.plannedMinutes),
          ],
          ['일한 날 수', summary.work.workedDays],
          ['저장된 작업 내역 수', summary.work.savedLogCount],
          [`변경·추가 작업 공수 (${unit})`, value(summary.changeWorks.minutes)],
          [`사후 작업 공수 (${unit})`, value(summary.afterService.minutes)],
          ['요약 기준일', summary.generatedOn],
        ],
      );
      sheet(
        '인원별 공수',
        ['이름', '일한 날 수', `공수 (${unit})`],
        [16, 12, 14],
        summary.work.byEmployee.map((row) => [row.name, row.workedDays, value(row.minutes)]),
      );
      sheet(
        '작업 구분별 공수',
        ['작업 구분', `공수 (${unit})`],
        [20, 14],
        summary.work.byCategory.map((row) => [row.categoryName, value(row.minutes)]),
      );
      sheet(
        '쓴 자재',
        ['품명', '규격', '쓴 양', '단위'],
        [24, 18, 12, 8],
        summary.materials
          .filter((item) => item.used > 0)
          .map((item) => [item.name, item.spec ?? '', item.used, item.unit]),
      );
      sheet(
        '변경·추가 작업',
        ['번호', '요청일', '요청자', '내용', '상태'],
        [8, 12, 16, 48, 10],
        summary.changeWorks.items.map((item) => [
          item.seq,
          item.requestedOn,
          item.requester,
          item.content,
          CHANGE_WORK_STATUS_LABELS[item.status],
        ]),
      );

      // 내보내기는 기록으로 남김 (누가 언제 무엇을 내보냈는지)
      await withCompany(app, companyId, async (tx) => {
        await tx.auditLog.create({
          data: {
            companyId,
            action: 'REPORT_EXPORTED',
            actorId: userId,
            targetId: projectId,
            projectId,
            detail: { kind: 'PROJECT_SUMMARY_XLSX' },
            createdAt: now(),
          },
        });
      });

      return {
        filename: `프로젝트요약_${project.code}.xlsx`,
        body: Buffer.from(await book.xlsx.writeBuffer()),
      };
    },
  };

  return service;
};
