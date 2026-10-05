import { createHash } from 'node:crypto';

import type { RequestHandler } from 'express';

import { AppError } from './AppError';

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const TTL_MS = 24 * 60 * 60 * 1000;

type Entry =
  | { state: 'processing'; fingerprint: string; expiresAt: number }
  | { state: 'done'; fingerprint: string; status: number; body: unknown; expiresAt: number };

export type IdempotencyStore = {
  get: (key: string) => Promise<Entry | undefined>;
  set: (key: string, entry: Entry) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

/**
 * @description 메모리 기반 멱등 키 저장소 (단일 서버 전제, 다중 서버·재시작 내성이 필요하면 DB 구현으로 교체)
 * @returns 저장소
 */
export const createMemoryIdempotencyStore = (): IdempotencyStore => {
  const entries = new Map<string, Entry>();

  return {
    get: async (key) => {
      const entry = entries.get(key);

      if (entry && entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }

      return entry;
    },
    set: async (key, entry) => {
      entries.set(key, entry);
    },
    delete: async (key) => {
      entries.delete(key);
    },
  };
};

/**
 * @description 쓰기 요청의 재전송을 한 번만 처리 (현장 회선 불안으로 같은 요청이 다시 와도 중복 저장 방지)
 * 회사 ID는 인증 이후 res.locals.auth에서만 얻으므로 이 미들웨어는 requireAuth 뒤에 둔다
 * @param store 키 저장소
 * @returns 멱등 키 미들웨어
 */
export const idempotency =
  (store: IdempotencyStore): RequestHandler =>
  async (req, res, next) => {
    const rawKey = req.get(IDEMPOTENCY_HEADER);
    const companyId = res.locals.auth?.companyId;

    if (!companyId) {
      next(new AppError('UNAUTHORIZED'));
      return;
    }

    if (!rawKey || !KEY_PATTERN.test(rawKey)) {
      next(new AppError('IDEMPOTENCY_KEY_REQUIRED'));
      return;
    }

    // 같은 키라도 회사·메서드·경로가 다르면 다른 요청으로 취급
    const storeKey = [companyId, req.method, req.route?.path ?? req.path, rawKey].join('|');
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(req.body ?? null))
      .digest('hex');
    const existing = await store.get(storeKey);

    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        next(new AppError('IDEMPOTENCY_KEY_REUSED'));
        return;
      }

      if (existing.state === 'processing') {
        next(new AppError('IDEMPOTENCY_IN_PROGRESS'));
        return;
      }

      res.set('Idempotent-Replayed', 'true').status(existing.status).json(existing.body);
      return;
    }

    await store.set(storeKey, { state: 'processing', fingerprint, expiresAt: Date.now() + TTL_MS });

    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // 성공 응답만 재사용하고 실패는 같은 키로 다시 시도할 수 있게 비움
      const save =
        res.statusCode >= 200 && res.statusCode < 300
          ? store.set(storeKey, {
              state: 'done',
              fingerprint,
              status: res.statusCode,
              body,
              expiresAt: Date.now() + TTL_MS,
            })
          : store.delete(storeKey);

      void save;
      return originalJson(body);
    };

    next();
  };
