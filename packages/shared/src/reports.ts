import { z } from 'zod';

import { workUnitModeSchema } from './account';
import { materialRecordKindSchema } from './materials';
import { photoCategorySchema } from './photos';
import { workLogStatusSchema } from './workLogs';

// 작업일보 (서비스 기획서 §15.4): 한 프로젝트의 하루 작업 내용·인원·공수·자재·사진을 모아 인쇄·PDF·엑셀로 내보낸다 (고객 제출용)
const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

export const REPORT_MAX_DAYS = 93;
export const REPORT_PHOTO_LIMIT = 24;

export const dailyReportParamsSchema = z.object({
  projectId: z.uuid(),
  date: dateSchema,
});

export const dailyReportEntrySchema = z.object({
  employeeId: z.uuid(),
  employeeName: z.string(),
  jobTypeName: z.string().nullable(),
  categoryName: z.string(),
  minutes: z.number().int(),
});

export type DailyReportEntry = z.infer<typeof dailyReportEntrySchema>;

export const dailyReportMaterialSchema = z.object({
  materialName: z.string(),
  spec: z.string().nullable(),
  unit: z.string(),
  kind: materialRecordKindSchema,
  quantity: z.number(),
  categoryName: z.string().nullable(),
  area: z.string().nullable(),
  isChange: z.boolean(),
  isAfterService: z.boolean(),
  memo: z.string().nullable(),
});

export type DailyReportMaterial = z.infer<typeof dailyReportMaterialSchema>;

export const dailyReportPhotoSchema = z.object({
  id: z.uuid(),
  category: photoCategorySchema,
  area: z.string().nullable(),
  description: z.string().nullable(),
  takenAt: z.iso.datetime(),
  // 검사가 끝나 썸네일이 있을 때만 (짧은 만료 주소라 출력 화면을 연 직후 인쇄해야 함)
  thumbnailUrl: z.url().nullable(),
  // 파일 검사·썸네일 작업이 아직 끝나지 않음 (화면이 잠시 뒤 다시 읽음). 검사에서 거부된 사진은 보고서에 싣지 않는다
  isProcessing: z.boolean(),
});

export type DailyReportPhoto = z.infer<typeof dailyReportPhotoSchema>;

export const dailyReportSchema = z.object({
  companyName: z.string(),
  project: z.object({
    id: z.uuid(),
    code: z.string(),
    name: z.string(),
    siteName: z.string(),
    siteAddress: z.string().nullable(),
    clientName: z.string().nullable(),
  }),
  date: dateSchema,
  // 그날 일지가 없으면 null (자재·사진만 있는 날도 보고서는 만들어짐)
  workLog: z
    .object({
      status: workLogStatusSchema,
      content: z.string(),
      area: z.string().nullable(),
      notes: z.string().nullable(),
      isChange: z.boolean(),
      isAfterService: z.boolean(),
    })
    .nullable(),
  entries: z.array(dailyReportEntrySchema),
  // 인원은 같은 직원이 여러 줄이어도 한 명으로 센다
  totals: z.object({ headcount: z.number().int(), minutes: z.number().int() }),
  // 공수 표시 방식 (회사 설정: 비율 MD 또는 시간)
  settings: z.object({ workUnitMode: workUnitModeSchema, standardWorkMinutes: z.number().int() }),
  materials: z.array(dailyReportMaterialSchema),
  photos: z.array(dailyReportPhotoSchema),
  // 사진이 제한 개수를 넘어 일부만 실렸는지
  hasMorePhotos: z.boolean(),
});

export type DailyReport = z.infer<typeof dailyReportSchema>;

// 엑셀 내보내기: 기간 안의 일지·공수·자재를 시트로 나눠 내려받는다. 내보내기는 기록으로 남는다 (§7.3)
export const reportExportQuerySchema = z
  .object({
    from: dateSchema,
    to: dateSchema,
  })
  .superRefine((value, context) => {
    const days =
      (Date.parse(`${value.to}T00:00:00Z`) - Date.parse(`${value.from}T00:00:00Z`)) / 86_400_000 +
      1;

    if (days < 1) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: '끝 날짜는 시작 날짜보다 빠를 수 없습니다',
      });
    } else if (days > REPORT_MAX_DAYS) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: `한 번에 ${REPORT_MAX_DAYS}일까지 내보낼 수 있습니다`,
      });
    }
  });

export type ReportExportQuery = z.infer<typeof reportExportQuerySchema>;

export const REPORT_XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * @description 공수(분)를 회사 설정의 표시 방식 값으로 바꿈 (비율이면 MD, 시간이면 시간, 소수 둘째 자리). 일보 화면과 엑셀이 같은 값을 쓴다
 * @param minutes 공수(분)
 * @param settings 회사 설정의 공수 표시 방식과 하루 기준시간
 * @returns 표시용 공수 값
 */
export const reportWorkValue = (
  minutes: number,
  settings: { workUnitMode: 'RATIO' | 'HOURS'; standardWorkMinutes: number },
) =>
  Math.round(
    ((settings.workUnitMode === 'HOURS' ? minutes / 60 : minutes / settings.standardWorkMinutes) +
      Number.EPSILON) *
      100,
  ) / 100;

export const reportWorkUnitLabel = (mode: 'RATIO' | 'HOURS') => (mode === 'HOURS' ? '시간' : 'MD');
