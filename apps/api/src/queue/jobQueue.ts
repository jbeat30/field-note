import { PgBoss } from 'pg-boss';

import type { Logger } from '../logger';

export type JobHandler<T> = (data: T) => Promise<void>;

// 작업 큐 추상화: 업무 코드는 pg-boss를 직접 알지 않고 이 인터페이스만 사용 (테스트·교체 용이)
export type JobQueue = {
  // 큐를 만들고(없으면) 재시도 정책을 지정
  register: (name: string, options?: QueueOptions) => Promise<void>;
  send: (name: string, data: object) => Promise<void>;
  // 처리기 등록. 처리기가 예외를 던지면 정책에 따라 재시도
  work: <T extends object>(name: string, handler: JobHandler<T>) => Promise<void>;
  stop: () => Promise<void>;
};

export type QueueOptions = {
  retryLimit?: number;
  // 첫 재시도까지의 대기(초), 이후 지수적으로 늘어남
  retryDelaySeconds?: number;
};

const DEFAULT_OPTIONS = { retryLimit: 5, retryDelaySeconds: 30 };

/**
 * @description PostgreSQL 기반 작업 큐 (Redis 없음, 기술 기획서 §7.4)
 * 큐 전용 DB 계정으로 접속하며 큐 테이블은 `pgboss` 스키마에만 만들어진다
 * @param connectionString 큐 전용 계정(DATABASE_QUEUE_URL) 접속 주소
 * @param logger 오류 기록용 로거
 * @returns 시작된 작업 큐
 */
export const createPgBossQueue = async (
  connectionString: string,
  logger: Logger,
): Promise<JobQueue> => {
  const boss = new PgBoss({ connectionString, schema: 'pgboss' });

  // 큐 내부 오류는 서버를 죽이지 않고 기록 (재시도 정책이 처리)
  boss.on('error', (error) => logger.error({ err: error }, '[queue.pgBoss] 작업 큐 오류'));

  await boss.start();

  return {
    register: async (name, options = {}) => {
      const retryLimit = options.retryLimit ?? DEFAULT_OPTIONS.retryLimit;
      const retryDelay = options.retryDelaySeconds ?? DEFAULT_OPTIONS.retryDelaySeconds;

      await boss.createQueue(name, { retryLimit, retryDelay, retryBackoff: true });
    },
    send: async (name, data) => {
      await boss.send(name, data);
    },
    work: async (name, handler) => {
      await boss.work<object>(name, async (jobs) => {
        // 한 건이라도 실패하면 예외를 그대로 던져 해당 작업이 재시도되게 함
        for (const job of jobs) {
          await handler(job.data as never);
        }
      });
    },
    stop: () => boss.stop({ graceful: true, timeout: 10_000 }),
  };
};

/**
 * @description 메모리 작업 큐 (DB 없는 단위 테스트용). 보낸 작업을 기록하고 처리기가 있으면 바로 실행
 * @returns 작업 큐와 보낸 작업 목록
 */
export const createMemoryQueue = () => {
  const handlers = new Map<string, JobHandler<never>>();
  const sent: { name: string; data: object }[] = [];

  const queue: JobQueue = {
    register: async () => undefined,
    send: async (name, data) => {
      sent.push({ name, data });
      await handlers.get(name)?.(data as never);
    },
    work: async (name, handler) => {
      handlers.set(name, handler as JobHandler<never>);
    },
    stop: async () => undefined,
  };

  return { queue, sent };
};
