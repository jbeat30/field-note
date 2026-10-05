import { createApp } from './app';
import { parseEnv } from './env';
import { createLogger } from './logger';

const env = parseEnv();
const logger = createLogger(env.LOG_LEVEL);

createApp({ logger, isDocsEnabled: env.NODE_ENV === 'development' }).listen(env.PORT, () => {
  logger.info({ port: env.PORT }, '[api.main] 서버 시작');
});
