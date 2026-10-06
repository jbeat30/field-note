import {
  closureCancelSchema,
  closureRequestSchema,
  closureResponseSchema,
  closureTokenParamsSchema,
  successResponseSchema,
  type ClosureRequest,
} from '@field-note/shared';

import { AccountError } from '../auth/accountError';
import { ClosureError, type ClosureService } from '../closure/closureService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (error instanceof AccountError) {
    if (error.code === 'CURRENT_PASSWORD_INVALID') return new AppError('CURRENT_PASSWORD_INVALID');
    if (error.code === 'ACCOUNT_LOCKED') return new AppError('ACCOUNT_LOCKED');
  }

  if (error instanceof ClosureError) {
    switch (error.code) {
      case 'LINK_INVALID':
        return new AppError('NOT_FOUND');
      case 'PASSWORD_REQUIRED':
        return new AppError('VALIDATION_ERROR', [
          { path: 'body.currentPassword', message: '현재 비밀번호를 입력해 주세요' },
        ]);
      case 'NOT_ACTIVE':
        return new AppError('VALIDATION_ERROR', [
          { path: 'body', message: '이미 해지 요청 중인 계정입니다' },
        ]);
    }
  }

  return error;
};

/**
 * @description 계정 해지 라우트: 요청(로그인 상태), 취소 링크 확인·취소(로그인 없이)
 * @param registry 라우트 등록소
 * @param closure 해지 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerClosureRoutes = (registry: RouteRegistry, closure?: ClosureService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, closure ? handler : notImplemented);

  add(
    {
      method: 'post',
      path: '/me/closure',
      summary: '계정 해지 요청 (즉시 로그인 차단, 14일 유예 뒤 삭제)',
      auth: 'required',
      request: { body: closureRequestSchema },
      response: { status: 200, schema: closureResponseSchema },
      errors: ['CURRENT_PASSWORD_INVALID', 'ACCOUNT_LOCKED'],
      rateLimit: { windowMs: 60_000, limit: 5 },
    },
    async ({ auth, body }) => {
      try {
        const { purgeAfter } = await closure!.request(
          auth!,
          (body as ClosureRequest).currentPassword,
        );

        return { purgeAfter: purgeAfter.toISOString() };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/auth/closure/{token}',
      summary: '해지 취소 링크 확인 (삭제 예정 시각)',
      auth: 'none',
      request: { params: closureTokenParamsSchema },
      response: { status: 200, schema: closureResponseSchema },
      errors: ['NOT_FOUND'],
      rateLimit: { windowMs: 60_000, limit: 30 },
    },
    async ({ params }) => {
      // 사용·만료·없는 링크는 구분하지 않음
      const info = await closure!.info((params as { token: string }).token);

      if (!info) {
        throw new AppError('NOT_FOUND');
      }

      return { purgeAfter: info.purgeAfter.toISOString() };
    },
  );

  add(
    {
      method: 'post',
      path: '/auth/closure/cancel',
      summary: '해지 취소 (계정 복구)',
      auth: 'none',
      request: { body: closureCancelSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['NOT_FOUND'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    async ({ body }) => {
      try {
        await closure!.cancel((body as { token: string }).token);
      } catch (error) {
        throw toAppError(error);
      }

      return { success: true };
    },
  );
};
