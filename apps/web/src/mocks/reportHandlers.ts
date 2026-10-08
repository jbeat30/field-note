import {
  REPORT_PHOTO_LIMIT,
  REPORT_XLSX_CONTENT_TYPE,
  dailyReportParamsSchema,
  projectFileParamsSchema,
  reportExportQuerySchema,
  type DailyReport,
  type ErrorCode,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';

import { listMockMaterialRecords } from './materialHandlers';
import { listMockPhotos } from './photoHandlers';
import {
  getCurrentAccount,
  getEmployees,
  getOptions,
  getPartners,
  getProjects,
  getWorkLogs,
} from './state';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
};

/**
 * @description 작업일보·엑셀 내보내기 API 목업 핸들러 (서버와 같은 규칙: 그날의 일지·인원·공수·자재·사진 모음, 사진은 제한 개수까지, 기간 검사). 엑셀은 실제 서식이 아니라 내려받기 흐름 확인용 자리 파일이다
 * @param helpers 공통 오류 응답
 * @returns msw 핸들러 목록
 */
export const createReportHandlers = ({ apiError }: Helpers) => [
  http.get('/api/v1/projects/:projectId/daily-reports/:date', async ({ params }) => {
    await delay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const parsed = dailyReportParamsSchema.safeParse(params);

    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues.map((issue) => ({
          path: ['params', ...issue.path].join('.'),
          message: issue.message,
        })),
      );
    }

    const { projectId, date } = parsed.data;
    const project = getProjects(account).find((item) => item.id === projectId);

    if (!project) return apiError('NOT_FOUND');

    const log = getWorkLogs(account).find(
      (item) => item.projectId === projectId && item.workDate === date,
    );
    const employees = getEmployees(account);
    const options = getOptions(account);
    const nameOf = (id: string) => options.find((option) => option.id === id)?.name ?? '';
    const entries = (log?.entries ?? [])
      .map((entry) => {
        const employee = employees.find((item) => item.id === entry.employeeId);

        return {
          employeeId: entry.employeeId,
          employeeName: employee?.name ?? '(알 수 없음)',
          jobTypeName: employee?.jobTypeId ? nameOf(employee.jobTypeId) || null : null,
          categoryName: nameOf(entry.categoryId),
          minutes: entry.minutes,
        };
      })
      .sort(
        (a, b) =>
          a.employeeName.localeCompare(b.employeeName, 'ko') ||
          a.categoryName.localeCompare(b.categoryName, 'ko'),
      );
    const photos = listMockPhotos(account, projectId)
      .filter((photo) => photo.workDate === date)
      .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    const report: DailyReport = {
      companyName: account.companyName,
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
        siteName: project.siteName,
        siteAddress: project.siteAddress ?? null,
        clientName:
          getPartners(account).find((partner) => partner.id === project.clientId)?.name ?? null,
      },
      date,
      workLog: log
        ? {
            status: log.status,
            content: log.content,
            area: log.area,
            notes: log.notes,
            isChange: log.isChange,
            isAfterService: log.isAfterService,
          }
        : null,
      entries,
      totals: {
        headcount: new Set(entries.map((entry) => entry.employeeId)).size,
        minutes: entries.reduce((sum, entry) => sum + entry.minutes, 0),
      },
      settings: {
        workUnitMode: account.settings.workUnitMode,
        standardWorkMinutes: account.settings.standardWorkMinutes,
      },
      materials: listMockMaterialRecords(account, projectId)
        .filter((record) => record.recordDate === date)
        .map((record) => ({
          materialName: record.materialName,
          spec: record.spec,
          unit: record.unit,
          kind: record.kind,
          quantity: record.quantity,
          categoryName: record.categoryId ? nameOf(record.categoryId) || null : null,
          area: record.area,
          isChange: record.isChange,
          isAfterService: record.isAfterService,
          memo: record.memo,
        })),
      photos: photos.slice(0, REPORT_PHOTO_LIMIT).map((photo) => ({
        id: photo.id,
        category: photo.category,
        area: photo.area,
        description: photo.description,
        takenAt: photo.takenAt,
        thumbnailUrl: photo.thumbnailUrl,
        isProcessing: photo.file.status === 'PENDING' || photo.file.status === 'PROCESSING',
      })),
      hasMorePhotos: photos.length > REPORT_PHOTO_LIMIT,
    };

    return HttpResponse.json(report);
  }),

  http.get('/api/v1/projects/:projectId/daily-reports.xlsx', async ({ request, params }) => {
    await delay(300);

    const account = getCurrentAccount();

    if (!account) return apiError('UNAUTHORIZED');

    const path = projectFileParamsSchema.safeParse(params);
    const query = reportExportQuerySchema.safeParse(
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

    const project = path.success
      ? getProjects(account).find((item) => item.id === path.data.projectId)
      : undefined;

    if (!project) return apiError('NOT_FOUND');

    // 서버와 같은 파일 이름 규칙. 내용은 자리 파일 (실제 엑셀 서식은 서버가 만든다)
    return new HttpResponse(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
      headers: {
        'Content-Type': REPORT_XLSX_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`작업일보_${project.code}_${query.data.from}_${query.data.to}.xlsx`)}`,
      },
    });
  }),
];
