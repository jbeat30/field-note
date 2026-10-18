import { z } from 'zod';

import { VALIDATION_MESSAGES } from './errorMessages';
// 계정·설정 화면과 API가 공유하는 계약
// 회사 식별값은 내부용이므로 어떤 응답에도 담지 않음

// 아이디: 소문자·숫자·밑줄·하이픈 4~20자 (서비스 전체에서 유일, 대소문자 구분 없음)
export const loginIdSchema = z
  .string()
  .regex(/^[a-z0-9_-]{4,20}$/, VALIDATION_MESSAGES.LOGIN_ID_FORMAT);

// 비밀번호 정책은 결정 전까지 최소 기준만 둠 (10~72자, bcrypt·argon2 입력 한도 고려)
export const passwordSchema = z
  .string()
  .min(10, VALIDATION_MESSAGES.PASSWORD_TOO_SHORT)
  .max(72, VALIDATION_MESSAGES.PASSWORD_TOO_LONG);

export const legalDocumentTypeSchema = z.enum(['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING']);

// 약관 종류별 제목과 전문 경로 (화면·API·시드가 같은 값 사용)
export const LEGAL_DOCUMENT_META = {
  TERMS_OF_SERVICE: { title: '이용약관', path: '/legal/terms' },
  PRIVACY_POLICY: { title: '개인정보 수집·이용 동의', path: '/legal/privacy' },
  MARKETING: { title: '마케팅 정보 수신 동의 (선택)', path: '/legal/marketing' },
} as const;

export type LegalDocumentType = z.infer<typeof legalDocumentTypeSchema>;

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
  // 가입 링크 또는 가입을 마친 계정의 복구·소유자 이전 링크
  purpose: z.enum(['SIGNUP', 'RECOVERY', 'TRANSFER']),
  documents: z.array(legalDocumentSummarySchema),
});

export type InvitationResponse = z.infer<typeof invitationResponseSchema>;

// 가입: 약관 동의·만 14세 확인·아이디·비밀번호·이메일
export const signupRequestSchema = z.object({
  inviteToken: z.string().min(8).max(128),
  loginId: loginIdSchema,
  password: passwordSchema,
  email: z.email().max(254),
  isAgeConfirmed: z.literal(true, VALIDATION_MESSAGES.UNDER_AGE),
  consents: z.array(z.object({ documentId: z.uuid(), isAgreed: z.boolean() })),
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;

// 가입 직후에는 이메일 인증 대기 상태, 인증이 끝나야 가입 완료
export const signupResponseSchema = z.object({
  email: z.email(),
  // 인증 코드 재발송까지 대기해야 하는 초
  resendAfterSeconds: z.number().int().nonnegative(),
});

export type SignupResponse = z.infer<typeof signupResponseSchema>;

export const emailVerifyRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/, VALIDATION_MESSAGES.required('6자리 숫자')),
});

export type EmailVerifyRequest = z.infer<typeof emailVerifyRequestSchema>;

export const emailResendResponseSchema = z.object({
  resendAfterSeconds: z.number().int().nonnegative(),
});

// 2단계 인증 코드: 인증 앱의 6자리 숫자 또는 복구 코드 (하이픈·공백은 서버가 무시)
export const totpCodeSchema = z.string().trim().min(6).max(24);

// 인증 앱 등록 확인에는 인증 앱이 보여 주는 6자리 숫자만 허용
export const totpDigitsSchema = z
  .string()
  .regex(/^\d{6}$/, VALIDATION_MESSAGES.required('6자리 숫자'));

export const loginRequestSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
  // 2단계 인증을 켠 계정만 필요 (없으면 TOTP_REQUIRED 응답 후 화면이 코드를 받아 같은 요청을 다시 보냄)
  totpCode: totpCodeSchema.optional(),
  // 현장 휴대폰용 자동 로그인
  isRemembered: z.boolean().default(true),
});

export type LoginRequest = z.input<typeof loginRequestSchema>;

// 비밀번호 재설정: 가입 여부를 알리지 않도록 요청 응답은 항상 같음
export const passwordResetRequestSchema = z.object({ email: z.email().max(254) });

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetParamsSchema = z.object({ token: z.string().min(8).max(128) });

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(8).max(128),
  newPassword: passwordSchema,
  // 2단계 인증을 켠 계정은 인증 코드 또는 복구 코드도 필요
  totpCode: totpCodeSchema.optional(),
});

// 링크가 유효한지와 함께 인증 코드 입력 칸이 필요한지 알림
export const passwordResetLinkResponseSchema = z.object({
  success: z.literal(true),
  requiresTotp: z.boolean(),
});

export type PasswordResetLinkResponse = z.infer<typeof passwordResetLinkResponseSchema>;

export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;

// 로그인 상태의 비밀번호 변경 (현재 비밀번호 재확인)
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export type PasswordChange = z.infer<typeof passwordChangeSchema>;

// 소셜 로그인만 쓰는 계정이 아이디·비밀번호 로그인을 처음 설정 (이미 소셜 로그인으로 본인이 확인된 상태라 현재 비밀번호는 없음)
export const passwordSetSchema = z.object({
  loginId: loginIdSchema,
  newPassword: passwordSchema,
});

export type PasswordSet = z.infer<typeof passwordSetSchema>;

// 이메일 변경: 비밀번호가 있는 계정은 비밀번호를 다시 확인하고, 새 이메일의 인증 코드를 확인해야 반영
// 소셜 로그인만 쓰는 계정은 확인할 비밀번호가 없어 생략하고, 소셜 가입 직후 이메일 등록에도 같은 요청을 씀
export const emailChangeSchema = z.object({
  newEmail: z.email().max(254),
  currentPassword: z.string().min(1).optional(),
});

export type EmailChange = z.infer<typeof emailChangeSchema>;

// 2단계 인증(TOTP): 선택 기능, 켜면 아이디 로그인과 비밀번호 재설정에 인증 앱의 코드가 더 필요함
export const TOTP_RECOVERY_CODE_COUNT = 8;

export const totpStatusSchema = z.object({
  isEnabled: z.boolean(),
  // 아직 쓰지 않은 복구 코드 수 (꺼져 있으면 0)
  recoveryCodesLeft: z.number().int().nonnegative(),
});

export type TotpStatus = z.infer<typeof totpStatusSchema>;

// 등록 시작: 인증 앱에 넣을 키와 QR로 만들 주소 (확인 전까지는 켜지지 않음)
export const totpSetupResponseSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
});

export type TotpSetupResponse = z.infer<typeof totpSetupResponseSchema>;

export const totpEnableSchema = z.object({ code: totpDigitsSchema });

export type TotpEnable = z.infer<typeof totpEnableSchema>;

// 복구 코드는 이 응답에서 한 번만 보여 주고 서버에는 해시만 남김
export const totpRecoveryCodesResponseSchema = z.object({
  recoveryCodes: z.array(z.string()),
});

export type TotpRecoveryCodesResponse = z.infer<typeof totpRecoveryCodesResponseSchema>;

// 끄기: 비밀번호 로그인이 있는 계정은 현재 비밀번호도 다시 확인
export const totpDisableSchema = z.object({
  code: totpCodeSchema,
  currentPassword: z.string().min(1).optional(),
});

export type TotpDisable = z.infer<typeof totpDisableSchema>;

export const totpRecoveryRegenerateSchema = z.object({ code: totpCodeSchema });

export type TotpRecoveryRegenerate = z.infer<typeof totpRecoveryRegenerateSchema>;

// 소셜 로그인: 제공자는 서버 설정에 따라 켜지고, 시작 요청은 로그인 화면 주소를 돌려줌
export const SOCIAL_PROVIDER_KEYS = ['kakao', 'naver', 'google'] as const;

export const socialProviderSchema = z.enum(SOCIAL_PROVIDER_KEYS);

export type SocialProviderKey = z.infer<typeof socialProviderSchema>;

export const SOCIAL_PROVIDER_LABELS: Record<SocialProviderKey, string> = {
  kakao: '카카오',
  naver: '네이버',
  google: '구글',
};

export const socialProviderParamsSchema = z.object({ provider: socialProviderSchema });

export const socialProvidersResponseSchema = z.object({
  kakao: z.boolean(),
  naver: z.boolean(),
  google: z.boolean(),
});

export type SocialProvidersResponse = z.infer<typeof socialProvidersResponseSchema>;

export const socialStartRequestSchema = z.discriminatedUnion('purpose', [
  z.object({ purpose: z.literal('login') }),
  // 초대 링크로 소셜 가입: 약관 동의와 만 14세 확인을 시작 시점에 함께 받음
  z.object({
    purpose: z.literal('signup'),
    inviteToken: z.string().min(8).max(128),
    isAgeConfirmed: z.literal(true, VALIDATION_MESSAGES.UNDER_AGE),
    consents: z.array(z.object({ documentId: z.uuid(), isAgreed: z.boolean() })),
  }),
]);

export type SocialStartRequest = z.infer<typeof socialStartRequestSchema>;

export const socialStartResponseSchema = z.object({ url: z.string().min(1) });

export const socialCallbackQuerySchema = z.object({
  code: z.string().max(2048).optional(),
  state: z.string().max(512).optional(),
  error: z.string().max(256).optional(),
});

// 제공자 화면에서 돌아온 뒤 화면에 보여줄 결과 (주소의 `?social=` 값)
export const SOCIAL_RESULTS = [
  'linked',
  'cancelled',
  'failed',
  'not-linked',
  'already-linked',
  'email-taken',
  'invitation-invalid',
  'closing',
] as const;

export type SocialResult = (typeof SOCIAL_RESULTS)[number];

export const socialMethodsResponseSchema = z.object({
  // 아이디·비밀번호 로그인 설정 여부 (없으면 소셜 연동을 해제할 수 없음)
  hasPassword: z.boolean(),
  kakao: z.object({ isLinked: z.boolean() }),
  naver: z.object({ isLinked: z.boolean() }),
  google: z.object({ isLinked: z.boolean() }),
});

export type SocialMethodsResponse = z.infer<typeof socialMethodsResponseSchema>;

// 계정 해지: 요청하면 즉시 로그인이 막히고 14일 유예 뒤 삭제, 메일로 받은 링크로 취소
// 비밀번호 로그인이 있는 계정은 현재 비밀번호를 다시 확인 (소셜 로그인만 쓰는 계정은 확인할 비밀번호가 없음)
export const closureRequestSchema = z.object({ currentPassword: z.string().min(1).optional() });

export type ClosureRequest = z.infer<typeof closureRequestSchema>;

export const closureResponseSchema = z.object({ purgeAfter: z.iso.datetime() });

export type ClosureResponse = z.infer<typeof closureResponseSchema>;

export const closureTokenParamsSchema = z.object({ token: z.string().min(8).max(128) });

export const closureCancelSchema = z.object({ token: z.string().min(8).max(128) });

// 로그인한 관리자 정보 (회사·계정 식별값은 포함하지 않음)
export const meResponseSchema = z.object({
  displayName: z.string(),
  email: z.email().nullable(),
  isEmailVerified: z.boolean(),
  companyName: z.string(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

// 공수 입력 방식: 비율(1.0=하루) 또는 시간
export const workUnitModeSchema = z.enum(['RATIO', 'HOURS']);

export type WorkUnitMode = z.infer<typeof workUnitModeSchema>;

export const companySettingsSchema = z.object({
  // 하루 기준시간(분), 저장은 항상 분 단위이므로 바꿔도 과거 기록은 변하지 않음
  standardWorkMinutes: z.number().int().min(60).max(960),
  // MM(맨먼스) 환산 기준 일수 (1MM = 이 일수의 MD), 소수 첫째 자리까지 (주 5일 21.7, 주 7일 30.4 등)
  monthlyWorkDays: z
    .number()
    .min(1)
    .max(31)
    .refine(
      (value) => Math.round(value * 10) / 10 === value,
      VALIDATION_MESSAGES.DECIMAL_ONE_PLACE,
    ),
  workUnitMode: workUnitModeSchema,
});

export type CompanySettings = z.infer<typeof companySettingsSchema>;

// 기본값: 하루 8시간, 월 26일(주 6일 현장 연평균 365×6÷7÷12≈26.1일), 비율 방식
export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  standardWorkMinutes: 480,
  monthlyWorkDays: 26,
  workUnitMode: 'RATIO',
};

// 근무 형태별 월 기준일수 표준값 (연평균: 365일 × 주 근무일수 ÷ 7 ÷ 12), 현장은 공휴일에도 일하므로 공휴일 달력 미사용
export const WORK_PATTERNS = [
  { key: 'SIX_DAYS', label: '주 6일', days: 26, hint: '현장 기본 (365×6÷7÷12 ≈ 26.1일)' },
  { key: 'FIVE_DAYS', label: '주 5일', days: 21.7, hint: '365×5÷7÷12 ≈ 21.7일' },
  { key: 'SEVEN_DAYS', label: '주 7일', days: 30.4, hint: '365÷12 ≈ 30.4일' },
] as const;

// 로그인 기기 목록, 식별자는 원격 로그아웃 대상 지정용 불투명 값
export const deviceSchema = z.object({
  id: z.string(),
  label: z.string(),
  lastActiveAt: z.iso.datetime(),
  isCurrent: z.boolean(),
  // 로그인 때 접속 IP와 마지막으로 쓴 때의 IP (모르면 null)
  ipAddress: z.string().nullable(),
  lastIp: z.string().nullable(),
});

export const devicesResponseSchema = z.object({ devices: z.array(deviceSchema) });

export const deviceParamsSchema = z.object({ id: z.string().min(1) });

export type Device = z.infer<typeof deviceSchema>;
