import { healthResponseSchema } from '@field-note/shared';

import type { RouteRegistry } from '../http/route';

export const registerHealthRoutes = ({ add }: RouteRegistry) => {
  add(
    {
      method: 'get',
      path: '/health',
      summary: '서버 상태 확인',
      auth: 'none',
      response: { status: 200, schema: healthResponseSchema },
    },
    async () => ({ status: 'ok', service: 'field-note' }),
  );
};
