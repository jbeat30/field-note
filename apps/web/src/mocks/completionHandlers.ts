import {
  REPORT_XLSX_CONTENT_TYPE,
  selectSummaryDocuments,
  selectSummaryPhotos,
  evaluateTransitionNotices,
  projectParamsSchema,
  summarizeMaterialBalance,
  todayInSeoul,
  transitionNoticesQuerySchema,
  type ErrorCode,
  type ProjectCompletionSummary,
} from '@field-note/shared';
import { http, HttpResponse } from 'msw';

import { listMockChangeWorks } from './changeWorkHandlers';
import type { MockAccount } from './data';
import { listMockDocuments } from './documentHandlers';
import { countMockRepairs } from './repairHandlers';
import { listMockMaterialRecords } from './materialHandlers';
import { listMockPhotos } from './photoHandlers';
import {
  getAssignments,
  getCurrentAccount,
  getEmployees,
  getOptions,
  getPartners,
  getProgressRecords,
  getProjects,
  getWorkLogs,
} from './state';
import { mockDelay } from './latency';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
};

// 같은 기준일이면 나중에 입력한 기록이 현재 값 (서버와 같은 순서)
const latestProgress = (account: MockAccount, projectId: string) =>
  [...getProgressRecords(account, projectId)].sort(
    (a, b) => b.recordedOn.localeCompare(a.recordedOn) || b.createdAt.localeCompare(a.createdAt),
  )[0];

// 자재 현황: 자재 이름·규격·단위를 붙인 기록을 서버와 같은 공유 함수로 집계
const balanceOf = (account: MockAccount, projectId: string) => {
  const records = listMockMaterialRecords(account, projectId);
  const materials = [
    ...new Map(
      records.map((record) => [
        record.materialId,
        { id: record.materialId, name: record.materialName, spec: record.spec, unit: record.unit },
      ]),
    ).values(),
  ];

  return summarizeMaterialBalance(records, materials);
};

/**
 * @description 상태 전환 안내·프로젝트 요약 목업 핸들러 (서버와 같은 공유 규칙: 완료 전 확인 사항, 종료 예정일 경과, 금액·민감 문서 제외)
 * @param helpers 공통 오류 응답
 * @returns msw 핸들러 목록
 */
export const createCompletionHandlers = ({ apiError }: Helpers) => [
  http.get('/api/v1/projects/:id/transition-notices', async ({ request, params }) => {
    await mockDelay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    const query = transitionNoticesQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    if (!query.success) {
      return apiError(
        'VALIDATION_ERROR',
        query.error.issues.map((issue) => ({
          path: ['query', ...issue.path].join('.'),
          message: issue.message,
        })),
      );
    }

    const project = getProjects(account).find((item) => item.id === parsed.data.id);

    if (!project) return apiError('NOT_FOUND');

    return HttpResponse.json({
      items: evaluateTransitionNotices({
        from: project.status,
        to: query.data.to,
        draftLogCount: getWorkLogs(account).filter(
          (log) => log.projectId === project.id && log.status === 'DRAFT',
        ).length,
        progressPercent: latestProgress(account, project.id)?.percent ?? null,
        materials: balanceOf(account, project.id).map((item) => ({
          materialId: item.materialId,
          name: item.name,
          spec: item.spec,
          unit: item.unit,
          remaining: item.remaining,
        })),
        negotiatingCount: listMockChangeWorks(account, project.id).filter(
          (work) => work.status === 'NEGOTIATING',
        ).length,
        openRepairCount: countMockRepairs(account, project.id).open,
        holdRepairCount: countMockRepairs(account, project.id).hold,
        plannedEnd: project.plannedEnd,
        today: todayInSeoul(new Date()),
      }),
    });
  }),

  http.get('/api/v1/projects/:id/summary.xlsx', async ({ params }) => {
    await mockDelay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const project = getProjects(account).find((item) => item.id === params.id);

    if (!project) return apiError('NOT_FOUND');

    // 서버와 같은 파일 이름 규칙. 내용은 자리 파일 (실제 엑셀 서식은 서버가 만든다)
    return new HttpResponse(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
      headers: {
        'Content-Type': REPORT_XLSX_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`프로젝트요약_${project.code}.xlsx`)}`,
      },
    });
  }),

  http.get('/api/v1/projects/:id/summary', async ({ params }) => {
    await mockDelay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = projectParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', [{ path: 'params.id', message: 'Invalid UUID' }]);
    }

    const project = getProjects(account).find((item) => item.id === parsed.data.id);

    if (!project) return apiError('NOT_FOUND');

    const employees = getEmployees(account);
    const categoryName = new Map(getOptions(account).map((item) => [item.id, item.name]));
    const logs = getWorkLogs(account).filter(
      (log) => log.projectId === project.id && log.status === 'SAVED',
    );
    const byEmployee = new Map<string, { name: string; days: Set<string>; minutes: number }>();
    const byCategory = new Map<string, number>();

    for (const log of logs) {
      for (const entry of log.entries) {
        const row = byEmployee.get(entry.employeeId) ?? {
          name: employees.find((item) => item.id === entry.employeeId)?.name ?? '(알 수 없음)',
          days: new Set<string>(),
          minutes: 0,
        };

        row.days.add(log.workDate);
        row.minutes += entry.minutes;
        byEmployee.set(entry.employeeId, row);

        const name = categoryName.get(entry.categoryId) ?? '(알 수 없음)';

        byCategory.set(name, (byCategory.get(name) ?? 0) + entry.minutes);
      }
    }

    const planned = getAssignments(account)
      .filter((item) => item.projectId === project.id && !item.cancelledAt)
      .flatMap((item) => (item.plannedMinutes === null ? [] : [item.plannedMinutes]));
    const flagged = (flag: 'isChange' | 'isAfterService') => {
      const rows = logs.filter((log) => log[flag]);

      return {
        workLogCount: rows.length,
        minutes: rows.flatMap((log) => log.entries).reduce((sum, entry) => sum + entry.minutes, 0),
      };
    };
    const change = flagged('isChange');
    const after = flagged('isAfterService');
    const photos = listMockPhotos(account, project.id).filter(
      (photo) => photo.file.status !== 'REJECTED',
    );
    const documents = listMockDocuments(account).filter((item) => item.projectId === project.id);
    // 서버와 같은 공유 규칙으로 요약에 실을 사진·문서를 고른다
    const summaryPhotoIds = new Set(selectSummaryPhotos(photos));
    const summaryDocumentIds = new Set(selectSummaryDocuments(documents));
    const summary: ProjectCompletionSummary = {
      generatedOn: todayInSeoul(new Date()),
      companyName: account.companyName,
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
        status: project.status,
        siteName: project.siteName,
        siteAddress: project.siteAddress ?? null,
        clientName: getPartners(account).find((item) => item.id === project.clientId)?.name ?? '',
        managerName: employees.find((item) => item.id === project.managerId)?.name ?? '',
        contractDate: project.contractDate,
        plannedStart: project.plannedStart,
        plannedEnd: project.plannedEnd,
        actualStart: project.actualStart ?? null,
        actualEnd: project.actualEnd ?? null,
      },
      progressPercent: latestProgress(account, project.id)?.percent ?? null,
      settings: {
        workUnitMode: account.settings.workUnitMode,
        standardWorkMinutes: account.settings.standardWorkMinutes,
        monthlyWorkDays: account.settings.monthlyWorkDays,
      },
      work: {
        totalMinutes: [...byEmployee.values()].reduce((sum, row) => sum + row.minutes, 0),
        plannedMinutes: planned.length > 0 ? planned.reduce((sum, value) => sum + value, 0) : null,
        workedDays: new Set(logs.map((log) => log.workDate)).size,
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
          .map(([name, minutes]) => ({ categoryName: name, minutes }))
          .sort(
            (a, b) => b.minutes - a.minutes || a.categoryName.localeCompare(b.categoryName, 'ko'),
          ),
      },
      materials: balanceOf(account, project.id),
      changeWorks: {
        items: listMockChangeWorks(account, project.id).map((work) => ({
          seq: work.seq,
          requestedOn: work.requestedOn,
          requester: work.requester,
          content: work.content,
          status: work.status,
        })),
        minutes: change.minutes,
        workLogCount: change.workLogCount,
      },
      afterService: after,
      photos: {
        total: photos.length,
        items: photos
          .filter((photo) => summaryPhotoIds.has(photo.id))
          .sort((a, b) => b.takenAt.localeCompare(a.takenAt) || b.id.localeCompare(a.id))
          .map((photo) => ({
            id: photo.id,
            category: photo.category,
            area: photo.area,
            description: photo.description,
            takenAt: photo.takenAt,
            thumbnailUrl: photo.thumbnailUrl,
          })),
      },
      documents: {
        sensitiveExcluded: documents.filter((item) => item.isSensitive).length,
        items: documents
          .filter((item) => summaryDocumentIds.has(item.id))
          .map((item) => ({
            id: item.id,
            title: item.title,
            category: item.category,
            versionCount: item.versionCount,
            latestRevisionDate: item.latest.revisionDate,
          })),
      },
    };

    return HttpResponse.json(summary);
  }),
];
