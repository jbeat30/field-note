import type { RequestHandler } from 'express';

import { isPublicDemoCompany } from '../demo/publicDemo';

import { AppError } from './AppError';

/**
 * @description 공개 시연 회사의 계정이 호출하면 403으로 막음 (requireAuth 뒤에 둠, 회사 ID는 세션에서 얻은 값)
 */
export const blockInPublicDemo: RequestHandler = (_req, res, next) => {
  const auth = res.locals.auth as { companyId: string } | undefined;

  if (auth && isPublicDemoCompany(auth.companyId)) {
    next(new AppError('DEMO_RESTRICTED'));
    return;
  }

  next();
};
