import { z } from 'zod';

// 파일 업로드 공통 규칙 (서비스 기획서 §12.1, 기술 기획서 §10). 서버와 웹 목업이 같은 규칙을 쓴다
export const FILE_PURPOSES = ['PHOTO', 'DOCUMENT'] as const;

export const filePurposeSchema = z.enum(FILE_PURPOSES);

export type FilePurpose = z.infer<typeof filePurposeSchema>;

// 업로드 → 내용 검사·썸네일 작업 → 사용 가능. 검사에서 걸러지면 거부됨
export const FILE_STATUSES = ['PENDING', 'PROCESSING', 'READY', 'REJECTED'] as const;

export const fileStatusSchema = z.enum(FILE_STATUSES);

export type FileStatus = z.infer<typeof fileStatusSchema>;

export const FILE_REJECT_REASONS = [
  // 내용으로 판별한 형식이 허용 목록에 없거나 선언한 형식·확장자와 다름
  'CONTENT_MISMATCH',
  // 올라온 크기가 신청한 크기와 다름
  'SIZE_MISMATCH',
  // 저장소에 파일이 올라오지 않음
  'NOT_UPLOADED',
  // 이미지로 열 수 없음
  'UNREADABLE_IMAGE',
] as const;

export const fileRejectReasonSchema = z.enum(FILE_REJECT_REASONS);

export type FileRejectReason = z.infer<typeof fileRejectReasonSchema>;

export const FILE_REJECT_REASON_LABELS: Record<FileRejectReason, string> = {
  CONTENT_MISMATCH: '파일 내용이 확장자와 맞지 않거나 허용되지 않는 형식입니다',
  SIZE_MISMATCH: '올라온 파일 크기가 신청한 크기와 다릅니다',
  NOT_UPLOADED: '파일이 올라오지 않았습니다',
  UNREADABLE_IMAGE: '이미지를 열 수 없습니다',
};

const MEGABYTE = 1024 * 1024;

// 용도별 파일 한 개의 최대 크기 (사진은 앱에서 압축해 올리므로 작게)
export const FILE_MAX_BYTES: Record<FilePurpose, number> = {
  PHOTO: 20 * MEGABYTE,
  DOCUMENT: 50 * MEGABYTE,
};

// 회사별 저장 용량 한도의 기본값 (운영자가 서버 용량에 맞춰 회사마다 조정)
export const DEFAULT_STORAGE_QUOTA_BYTES = 5 * 1024 * MEGABYTE;

export const FILE_NAME_MAX_LENGTH = 200;

// 업로드 주소·내려받기 주소의 유효 시간 (짧게 유지)
export const FILE_UPLOAD_URL_TTL_SECONDS = 15 * 60;
export const FILE_DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

// 허용 형식 목록 (이미지·PDF·오피스 문서만, 실행 파일 등은 목록에 없으므로 모두 거부)
// 확장자가 아니라 내용으로 판별한 형식(mime)을 이 표와 비교한다
export const ALLOWED_FILE_TYPES: readonly {
  mime: string;
  extensions: readonly string[];
  purposes: readonly FilePurpose[];
}[] = [
  { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], purposes: ['PHOTO', 'DOCUMENT'] },
  { mime: 'image/png', extensions: ['png'], purposes: ['PHOTO', 'DOCUMENT'] },
  { mime: 'image/webp', extensions: ['webp'], purposes: ['PHOTO', 'DOCUMENT'] },
  { mime: 'application/pdf', extensions: ['pdf'], purposes: ['DOCUMENT'] },
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['docx'],
    purposes: ['DOCUMENT'],
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extensions: ['xlsx'],
    purposes: ['DOCUMENT'],
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extensions: ['pptx'],
    purposes: ['DOCUMENT'],
  },
];

// 썸네일을 만드는 형식 (이미지)
export const isImageMime = (mime: string) => mime.startsWith('image/');

/**
 * @description 파일 이름에서 확장자를 소문자로 추출
 * @param name 파일 이름
 * @returns 점 없는 소문자 확장자 (없으면 빈 문자열)
 */
export const fileExtension = (name: string) => {
  const dot = name.lastIndexOf('.');

  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
};

/**
 * @description 형식(mime)이 용도의 허용 목록에 있고 확장자가 그 형식의 확장자인지 확인
 * @param purpose 파일 용도
 * @param mime 형식 (선언한 값 또는 내용으로 판별한 값)
 * @param name 원본 파일 이름
 * @returns 허용 여부
 */
export const isAllowedFileType = (purpose: FilePurpose, mime: string, name: string) =>
  ALLOWED_FILE_TYPES.some(
    (type) =>
      type.mime === mime &&
      type.purposes.includes(purpose) &&
      type.extensions.includes(fileExtension(name)),
  );

/**
 * @description 객체 저장소 경로 (경로에 회사가 들어가며 저장소는 공개하지 않음, 기술 기획서 §10)
 * @param companyId 회사 ID
 * @param projectId 프로젝트 ID
 * @param fileId 파일 ID
 * @param variant 원본 또는 썸네일
 * @returns 객체 키
 */
export const fileObjectKey = (
  companyId: string,
  projectId: string,
  fileId: string,
  variant: 'original' | 'thumbnail',
) => `company/${companyId}/project/${projectId}/${fileId}/${variant}`;

export const fileParamsSchema = z.object({ id: z.uuid() });

export const projectFileParamsSchema = z.object({ projectId: z.uuid() });

const hasForbiddenNameChar = (name: string) =>
  [...name].some((char) => {
    const code = char.charCodeAt(0);

    return char === '/' || char === '\\' || code <= 0x1f || code === 0x7f;
  });

// 이름에 경로 구분자·제어 문자를 넣지 못하게 막음 (내려받기 헤더·경로 조작 방지)
const fileNameSchema = z
  .string()
  .trim()
  .min(1, '파일 이름을 입력해 주세요')
  .max(FILE_NAME_MAX_LENGTH, `파일 이름은 ${FILE_NAME_MAX_LENGTH}자까지 입력할 수 있습니다`)
  .refine((value) => !hasForbiddenNameChar(value), '파일 이름에 사용할 수 없는 문자가 있습니다');

export const fileUploadRequestSchema = z
  .object({
    name: fileNameSchema,
    purpose: filePurposeSchema,
    // 브라우저가 알려 준 형식 (신뢰하지 않고 허용 목록과 업로드 후 내용 검사로 다시 확인)
    contentType: z.string().trim().min(1).max(100),
    size: z.number().int().min(1, '빈 파일은 올릴 수 없습니다'),
  })
  .superRefine((value, context) => {
    if (!isAllowedFileType(value.purpose, value.contentType, value.name)) {
      context.addIssue({
        code: 'custom',
        path: ['contentType'],
        message: '올릴 수 없는 파일 형식입니다 (이미지, PDF, Word·Excel·PowerPoint만 가능)',
      });
    }

    if (value.size > FILE_MAX_BYTES[value.purpose]) {
      context.addIssue({
        code: 'custom',
        path: ['size'],
        message: `파일 하나는 ${FILE_MAX_BYTES[value.purpose] / MEGABYTE}MB까지 올릴 수 있습니다`,
      });
    }
  });

export type FileUploadRequest = z.infer<typeof fileUploadRequestSchema>;

export const storedFileSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  purpose: filePurposeSchema,
  name: z.string(),
  // 사용 가능해진 뒤에는 내용으로 판별한 형식
  contentType: z.string(),
  size: z.number().int(),
  status: fileStatusSchema,
  rejectReason: fileRejectReasonSchema.nullable(),
  hasThumbnail: z.boolean(),
  // 원본 파일 내용의 SHA-256 (사용 가능해질 때 계산, 원본임을 입증하는 고유값)
  sha256: z.string().nullable(),
  uploadedBy: z.uuid(),
  createdAt: z.iso.datetime(),
  readyAt: z.iso.datetime().nullable(),
});

export type StoredFile = z.infer<typeof storedFileSchema>;

export const fileUploadTicketSchema = z.object({
  file: storedFileSchema,
  upload: z.object({
    url: z.url(),
    method: z.literal('PUT'),
    // 업로드 요청에 그대로 실어야 하는 헤더
    headers: z.record(z.string(), z.string()),
    expiresAt: z.iso.datetime(),
  }),
});

export type FileUploadTicket = z.infer<typeof fileUploadTicketSchema>;

export const FILE_URL_VARIANTS = ['original', 'thumbnail'] as const;

export const fileUrlQuerySchema = z.object({
  variant: z.enum(FILE_URL_VARIANTS).default('original'),
});

export type FileUrlQuery = z.infer<typeof fileUrlQuerySchema>;

export const fileUrlResponseSchema = z.object({
  url: z.url(),
  expiresAt: z.iso.datetime(),
});

export type FileUrlResponse = z.infer<typeof fileUrlResponseSchema>;
