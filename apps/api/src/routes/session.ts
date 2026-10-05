import { sessionResponseSchema } from '@field-note/shared';

import type { RouteRegistry } from '../http/route';

export const registerSessionRoutes = ({ add }: RouteRegistry) => {
  add(
    {
      method: 'get',
      path: '/session',
      summary: '현재 세션 확인',
      auth: 'required',
      response: { status: 200, schema: sessionResponseSchema },
    },
    // auth: 'required'이므로 requireAuth를 통과한 요청만 도달
    async ({ auth }) => auth,
  );
};
