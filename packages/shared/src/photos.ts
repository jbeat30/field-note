import { z } from 'zod';

import { fileRejectReasonSchema, fileStatusSchema } from './files';

// 작업 사진 (서비스 기획서 §12.2). 파일 자체는 파일 업로드(files)에 있고 사진은 구분·구역·촬영일시·설명을 덧붙인 기록이다
export const PHOTO_CATEGORIES = [
  'BEFORE',
  'DURING',
  'AFTER',
  'DEFECT',
  'MATERIAL',
  'SAFETY',
  'OTHER',
] as const;

export const photoCategorySchema = z.enum(PHOTO_CATEGORIES);

export type PhotoCategory = z.infer<typeof photoCategorySchema>;

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  BEFORE: '작업 전',
  DURING: '작업 중',
  AFTER: '작업 후',
  DEFECT: '하자·보수',
  MATERIAL: '자재',
  SAFETY: '안전',
  OTHER: '기타',
};

export const PHOTO_AREA_MAX_LENGTH = 100;
export const PHOTO_DESCRIPTION_MAX_LENGTH = 500;
export const PHOTO_PAGE_DEFAULT_LIMIT = 50;
export const PHOTO_PAGE_MAX_LIMIT = 100;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

const areaSchema = z
  .string()
  .trim()
  .min(1)
  .max(PHOTO_AREA_MAX_LENGTH, `구역은 ${PHOTO_AREA_MAX_LENGTH}자까지 입력할 수 있습니다`);

const descriptionSchema = z
  .string()
  .trim()
  .min(1)
  .max(
    PHOTO_DESCRIPTION_MAX_LENGTH,
    `설명은 ${PHOTO_DESCRIPTION_MAX_LENGTH}자까지 입력할 수 있습니다`,
  );

export const photoParamsSchema = z.object({ id: z.uuid() });

// 파일을 올린 뒤 사진으로 등록. 촬영일시를 비우면 등록 시각, 작업일을 비우면 촬영일(서울 기준)로 정한다
export const photoCreateSchema = z.object({
  fileId: z.uuid(),
  category: photoCategorySchema.default('OTHER'),
  area: areaSchema.optional(),
  takenAt: z.iso.datetime({ offset: true }).optional(),
  workDate: dateSchema.optional(),
  description: descriptionSchema.optional(),
});

export type PhotoCreate = z.infer<typeof photoCreateSchema>;

export const photoUpdateSchema = z
  .object({
    category: photoCategorySchema,
    area: areaSchema.nullable(),
    takenAt: z.iso.datetime({ offset: true }),
    workDate: dateSchema,
    description: descriptionSchema.nullable(),
    // true로 바꾸면 같은 프로젝트의 기존 대표 사진은 해제된다
    isCover: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, '바꿀 값을 하나 이상 보내 주세요');

export type PhotoUpdate = z.infer<typeof photoUpdateSchema>;

export const photoListQuerySchema = z.object({
  category: photoCategorySchema.optional(),
  area: areaSchema.optional(),
  workDate: dateSchema.optional(),
  // 이전 응답의 nextCursor (촬영일시 최근순)
  cursor: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(PHOTO_PAGE_MAX_LIMIT).default(PHOTO_PAGE_DEFAULT_LIMIT),
});

export type PhotoListQuery = z.infer<typeof photoListQuerySchema>;

export const photoSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  fileId: z.uuid(),
  category: photoCategorySchema,
  area: z.string().nullable(),
  takenAt: z.iso.datetime(),
  workDate: dateSchema,
  description: z.string().nullable(),
  isCover: z.boolean(),
  uploadedBy: z.uuid(),
  // 사진으로 등록한 시각 (업로드 시각은 파일 정보에 있음)
  createdAt: z.iso.datetime(),
  file: z.object({
    status: fileStatusSchema,
    rejectReason: fileRejectReasonSchema.nullable(),
    size: z.number().int(),
  }),
  // 짧은 만료의 썸네일 주소 (검사가 끝나 썸네일이 있을 때만)
  thumbnailUrl: z.url().nullable(),
});

export type Photo = z.infer<typeof photoSchema>;

export const photosResponseSchema = z.object({
  items: z.array(photoSchema),
  nextCursor: z.string().nullable(),
});

export type PhotosResponse = z.infer<typeof photosResponseSchema>;
