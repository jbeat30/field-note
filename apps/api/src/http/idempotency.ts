import { createHash } from 'node:crypto';

import type { RequestHandler } from 'express';

import { AppError } from './AppError';

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
// 처리 중 표시는 짧게 둔다 (서버가 도중에 멈춰도 같은 키로 곧 다시 시도할 수 있게)
export const IDEMPOTENCY_PROCESSING_TTL_MS = 2 * 60 * 1000;

export type IdempotencyEntry =
  | { state: 'processing'; fingerprint: string; expiresAt: number }
  | { state: 'done'; fingerprint: string; status: number; body: unknown; expiresAt: number };

// 키는 회사마다 따로 보관한다 (다른 회사의 키와 겹쳐도 서로 보이지 않음)
export type IdempotencyStore = {
  // 처음 보는 키는 처리 중으로 선점하고 null 반환, 이미 있으면(만료 전) 그 기록 반환, 동시에 같은 키가 와도 한 요청만 선점
  claim: (
    companyId: string,
    key: string,
    entry: Extract<IdempotencyEntry, { state: 'processing' }>,
  ) => Promise<IdempotencyEntry | null>;
  // 처리가 끝난 응답을 저장
  complete: (
    companyId: string,
    key: string,
    entry: Extract<IdempotencyEntry, { state: 'done' }>,
  ) => Promise<void>;
  // 실패한 요청의 선점을 풀어 같은 키로 다시 시도할 수 있게 함
  release: (companyId: string, key: string) => Promise<void>;
};

/**
 * @description 메모리 기반 멱등 키 저장소 (단위 테스트용. 운영은 DB 구현 `createPrismaIdempotencyStore`)
 * @returns 저장소
 */
export const createMemoryIdempotencyStore = (): IdempotencyStore => {
  const entries = new Map<string, IdempotencyEntry>();
  const at = (companyId: string, key: string) => `${companyId}|${key}`;

  return {
    claim: async (companyId, key, entry) => {
      const existing = entries.get(at(companyId, key));

      if (existing && existing.expiresAt > Date.now()) {
        return existing;
      }

      entries.set(at(companyId, key), entry);
      return null;
    },
    complete: async (companyId, key, entry) => {
      entries.set(at(companyId, key), entry);
    },
    release: async (companyId, key) => {
      entries.delete(at(companyId, key));
    },
  };
};

type IdempotencyOptions = {
  // true면 헤더가 없어도 그대로 처리 (웹 앱은 항상 보내고, 키가 없는 호출은 보호만 받지 못함)
  optional?: boolean;
};

/**
 * @description 쓰기 요청의 재전송을 한 번만 처리 (현장 회선 불안으로 같은 요청이 다시 와도 중복 저장 방지)
 * 회사 ID는 인증 이후 res.locals.auth에서만 획득하므로 이 미들웨어는 requireAuth 뒤에 배치
 * @param store 키 저장소
 * @param options 헤더 없는 요청 허용 여부
 * @returns 멱등 키 미들웨어
 */
export const idempotency =
  (store: IdempotencyStore, options: IdempotencyOptions = {}): RequestHandler =>
  async (req, res, next) => {
    const rawKey = req.get(IDEMPOTENCY_HEADER);
    const companyId = res.locals.auth?.companyId;

    if (!companyId) {
      next(new AppError('UNAUTHORIZED'));
      return;
    }

    if (!rawKey && options.optional) {
      next();
      return;
    }

    if (!rawKey || !KEY_PATTERN.test(rawKey)) {
      next(new AppError('IDEMPOTENCY_KEY_REQUIRED'));
      return;
    }

    // 같은 키라도 메서드·경로가 다르면 다른 요청으로 취급 (회사는 저장소가 나눔)
    const storeKey = [req.method, req.route?.path ?? req.path, rawKey].join('|');
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(req.body ?? null))
      .digest('hex');
    const existing = await store.claim(companyId, storeKey, {
      state: 'processing',
      fingerprint,
      expiresAt: Date.now() + IDEMPOTENCY_PROCESSING_TTL_MS,
    });

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

    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // 성공 응답만 재사용하고 실패는 같은 키로 다시 시도할 수 있게 비움
      const save =
        res.statusCode >= 200 && res.statusCode < 300
          ? store.complete(companyId, storeKey, {
              state: 'done',
              fingerprint,
              status: res.statusCode,
              body,
              expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
            })
          : store.release(companyId, storeKey);

      // 저장 실패가 응답을 막지 않게 함 (다음 재시도는 처리 중/없음으로 보일 수 있음)
      save.catch(() => undefined);
      return originalJson(body);
    };

    next();
  };
