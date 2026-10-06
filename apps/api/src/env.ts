import { z } from 'zod';

const envSchema = z.object({
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
