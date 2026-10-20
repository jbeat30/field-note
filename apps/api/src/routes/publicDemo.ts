import { publicDemoResponseSchema } from '@field-note/shared';

import { PUBLIC_DEMO } from '../demo/publicDemo';
import type { RouteRegistry } from '../http/route';

/**
 * @description 로그인 화면의 시연 계정 안내, 켜져 있을 때만 공개 시연 계정의 아이디·비밀번호를 내려줌
 * @param registry 라우트 등록소
 * @param isEnabled 공개 시연 안내 사용 여부 (PUBLIC_DEMO_ENABLED)
 */
export const registerPublicDemoRoutes = ({ add }: RouteRegistry, isEnabled = false) => {
  add(
    {
      method: 'get',
      path: '/public/demo',
      summary: '시연 계정 안내 (켜져 있을 때만 아이디·비밀번호 포함)',
      auth: 'none',
      response: { status: 200, schema: publicDemoResponseSchema },
    },
    async () =>
      isEnabled
        ? { enabled: true, loginId: PUBLIC_DEMO.loginId, password: PUBLIC_DEMO.password }
        : { enabled: false },
  );
};
