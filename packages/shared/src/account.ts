import { z } from 'zod';

// 계정·설정 화면과 API가 공유하는 계약 (서비스 기획서 §5.7, §6, §9.5)
// 회사 식별값은 내부용이므로 어떤 응답에도 담지 않는다 (§5.1)

// 아이디: 소문자·숫자·밑줄·하이픈 4~20자 (서비스 전체에서 유일, 대소문자 구분 없음)
export const loginIdSchema = z
  .string()
  .regex(/^[a-z0-9_-]{4,20}$/, '소문자·숫자·밑줄·하이픈 4~20자');

// 비밀번호 정책은 §18.1 결정 전까지 최소 기준만 둠 (10~72자, bcrypt·argon2 입력 한도 고려)
export const passwordSchema = z.string().min(10, '10자 이상').max(72, '72자 이하');

export const legalDocumentTypeSchema = z.enum(['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING']);

export const legalDocumentSummarySchema = z.object({
  id: z.uuid(),
  type: legalDocumentTypeSchema,
  version: z.string(),
  title: z.string(),
  isRequired: z.boolean(),
  // 전문을 볼 수 있는 화면 경로
  path: z.string(),
});

export type LegalDocumentSummary = z.infer<typeof legalDocumentSummarySchema>;

// 초대 링크 확인 (가입 화면 진입 시)
export const invitationParamsSchema = z.object({ token: z.string().min(8).max(128) });

export const invitationResponseSchema = z.object({
  companyName: z.string(),
  adminName: z.string(),
  expiresAt: z.iso.datetime(),
  documents: z.array(legalDocumentSummarySchema),
});

export type InvitationResponse = z.infer<typeof invitationResponseSchema>;

// 가입: 약관 동의·만 14세 확인·아이디·비밀번호·이메일
export const signupRequestSchema = z.object({
  inviteToken: z.string().min(8).max(128),
  loginId: loginIdSchema,
  password: passwordSchema,
  email: z.email().max(254),
  isAgeConfirmed: z.literal(true, '만 14세 이상만 가입할 수 있습니다'),
  consents: z.array(z.object({ documentId: z.uuid(), isAgreed: z.boolean() })),
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;

// 가입 직후에는 이메일 인증 대기 상태, 인증이 끝나야 가입 완료 (§6.7)
export const signupResponseSchema = z.object({
  email: z.email(),
  // 인증 코드 재발송까지 대기해야 하는 초
  resendAfterSeconds: z.number().int().nonnegative(),
});

export type SignupResponse = z.infer<typeof signupResponseSchema>;

export const emailVerifyRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/, '6자리 숫자를 입력해 주세요'),
});

export type EmailVerifyRequest = z.infer<typeof emailVerifyRequestSchema>;

export const emailResendResponseSchema = z.object({
  resendAfterSeconds: z.number().int().nonnegative(),
});

export const loginRequestSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
  // 현장 휴대폰용 자동 로그인 (§6.4)
  isRemembered: z.boolean().default(true),
});

export type LoginRequest = z.input<typeof loginRequestSchema>;

// 로그인한 관리자 정보 (회사·계정 식별값은 포함하지 않음)
export const meResponseSchema = z.object({
  displayName: z.string(),
  email: z.email().nullable(),
  isEmailVerified: z.boolean(),
  companyName: z.string(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

// 공수 입력 방식: 비율(1.0=하루) 또는 시간 (§9.5)
export const workUnitModeSchema = z.enum(['RATIO', 'HOURS']);

export type WorkUnitMode = z.infer<typeof workUnitModeSchema>;

export const companySettingsSchema = z.object({
  // 하루 기준시간(분). 저장은 항상 분 단위이므로 바꿔도 과거 기록은 변하지 않음
  standardWorkMinutes: z.number().int().min(60).max(960),
  // MM 계산에 쓰는 월 기준일수
  monthlyWorkDays: z.number().int().min(1).max(31),
  workUnitMode: workUnitModeSchema,
});

export type CompanySettings = z.infer<typeof companySettingsSchema>;

// 로그인 기기 목록 (§6.4). 식별자는 원격 로그아웃 대상 지정용 불투명 값
export const deviceSchema = z.object({
  id: z.string(),
  label: z.string(),
  lastActiveAt: z.iso.datetime(),
  isCurrent: z.boolean(),
});

export const devicesResponseSchema = z.object({ devices: z.array(deviceSchema) });

export const deviceParamsSchema = z.object({ id: z.string().min(1) });

export type Device = z.infer<typeof deviceSchema>;
