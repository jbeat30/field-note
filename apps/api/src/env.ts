import { z } from 'zod';

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url(),
  DATABASE_MIGRATE_URL: z.url(),
  DATABASE_AUTH_URL: z.url(),
  // 작업 큐(pg-boss) 전용 계정: 큐 스키마만 접근
  DATABASE_QUEUE_URL: z.url(),
  // 이메일 인증 코드 해시용 서버 비밀 값 (유출되면 6자리 코드를 대입으로 복원할 수 있으므로 32자 이상 무작위)
  CODE_HASH_SECRET: z.string().min(32),
  // 소셜 로그인 진행 상태 쿠키 암호화용 서버 비밀 값 (개발 환경 가짜 제공자의 코드 서명에도 사용)
  OAUTH_COOKIE_SECRET: z.string().min(32),
  // 소셜 앱 등록 후 채움 (제공자마다 ID와 시크릿이 모두 있어야 그 제공자의 로그인이 켜지고, 없으면 운영에서는 해당 로그인이 꺼짐)
  KAKAO_CLIENT_ID: z.string().min(1).optional(),
  KAKAO_CLIENT_SECRET: z.string().min(1).optional(),
  NAVER_CLIENT_ID: z.string().min(1).optional(),
  NAVER_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  // 앞단 프록시(CloudFront·로드 밸런서 등) 단계 수 (0은 프록시 없는 직접 접속, 프록시 뒤에서 0이면 모든 사용자가 같은 IP로 보여 요청 횟수 제한 공유)
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  // 브라우저에서 접속하는 웹 주소 (CSRF Origin 검증 기준)
  APP_ORIGIN: z.url(),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  // 운영 메일 서비스는 계정이 필요하고, 로컬(Mailpit)은 없음
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM: z.email(),
});

// 로컬 개발용 값이 운영에 섞이는 사고를 막는 검사 (환경 분리)
const LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  'postgres',
  'mailpit',
  'rustfs',
]);
const isLocalHost = (value: string) => {
  try {
    return LOCAL_HOSTS.has(new URL(value).hostname);
  } catch {
    return LOCAL_HOSTS.has(value);
  }
};

const envSchema = baseSchema.superRefine((env, context) => {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const problem = (path: keyof typeof env, message: string) =>
    context.addIssue({ code: 'custom', path: [path], message });

  for (const key of [
    'DATABASE_URL',
    'DATABASE_MIGRATE_URL',
    'DATABASE_AUTH_URL',
    'DATABASE_QUEUE_URL',
    'S3_ENDPOINT',
  ] as const) {
    if (isLocalHost(env[key])) problem(key, '운영에서는 로컬 주소를 쓸 수 없음');
  }

  if (isLocalHost(env.SMTP_HOST)) problem('SMTP_HOST', '운영에서는 로컬 메일 수신기를 쓸 수 없음');
  if (!env.SMTP_USER || !env.SMTP_PASSWORD)
    problem('SMTP_USER', '운영 메일 서비스의 계정이 필요함');
  if (new URL(env.APP_ORIGIN).protocol !== 'https:') problem('APP_ORIGIN', '운영은 https여야 함');
  if (env.LOG_LEVEL === 'debug' || env.LOG_LEVEL === 'trace') {
    problem(
      'LOG_LEVEL',
      '운영에서는 debug 이하 로그를 켤 수 없음 (개인정보가 로그에 남을 수 있음)',
    );
  }

  // 로컬 `.env.example`에서 만든 값 그대로의 사용 차단 (비밀 값은 환경마다 새로 생성)
  for (const key of ['DATABASE_URL', 'DATABASE_MIGRATE_URL', 'S3_SECRET_KEY'] as const) {
    if (/field_note_secret|:field_note@|:field_note_app@/.test(env[key])) {
      problem(key, '로컬 기본 비밀번호를 운영에서 쓸 수 없음');
    }
  }
});

export type Env = z.infer<typeof envSchema>;

/**
 * @description 환경 변수 검증 및 타입 있는 설정 객체 반환 (누락·형식 오류 시 기동 중단)
 * @param source 검증할 환경 변수 (기본은 process.env)
 * @returns 검증을 통과한 설정
 */
export const parseEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    // 값은 비밀일 수 있어 변수 이름과 사유만 노출
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`[env.parseEnv] 환경 변수 오류 ${issues}`);
  }

  return result.data;
};
