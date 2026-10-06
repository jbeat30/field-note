import { createApp } from './app';
import { createAccountService } from './auth/accountService';
import { createPrismaClient } from './db/client';
import { parseEnv } from './env';
import { createLogger } from './logger';
import { createPrismaInvitationStore } from './invitation/invitationStore';
import { createPrismaSessionStore } from './session/sessionStore';

const env = parseEnv();
const logger = createLogger(env.LOG_LEVEL);

// 회사 범위 밖 전용 계정은 세션 저장소에만 연결 (업무 쿼리는 withCompany 경로로만)
const authPrisma = createPrismaClient(env.DATABASE_AUTH_URL);
const sessionStore = createPrismaSessionStore(authPrisma);
const invitationStore = createPrismaInvitationStore(authPrisma);
// 로그인 후 회사 범위 조회는 앱 계정(RLS 적용)으로만 수행
const accountService = createAccountService({
  auth: authPrisma,
  app: createPrismaClient(env.DATABASE_URL),
});

createApp({
  logger,
  sessionStore,
  invitationStore,
  accountService,
  appOrigin: env.APP_ORIGIN,
  isSecureCookie: env.NODE_ENV === 'production',
  isDocsEnabled: env.NODE_ENV === 'development',
}).listen(env.PORT, () => {
  logger.info({ port: env.PORT }, '[api.main] 서버 시작');
});
