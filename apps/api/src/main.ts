import { createApp } from './app';
import { createPrismaClient } from './db/client';
import { parseEnv } from './env';
import { createLogger } from './logger';
import { createPrismaSessionStore } from './session/sessionStore';

const env = parseEnv();
const logger = createLogger(env.LOG_LEVEL);

// 회사 범위 밖 전용 계정은 세션 저장소에만 연결 (업무 쿼리는 withCompany 경로로만)
const sessionStore = createPrismaSessionStore(createPrismaClient(env.DATABASE_AUTH_URL));

createApp({
  logger,
  sessionStore,
  appOrigin: env.APP_ORIGIN,
  isSecureCookie: env.NODE_ENV === 'production',
  isDocsEnabled: env.NODE_ENV === 'development',
}).listen(env.PORT, () => {
  logger.info({ port: env.PORT }, '[api.main] 서버 시작');
});
