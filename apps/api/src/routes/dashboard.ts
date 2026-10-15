import {
  alertDismissSchema,
  alertSettingsSchema,
  alertSettingsUpdateSchema,
  dashboardResponseSchema,
  successResponseSchema,
  type AlertDismiss,
  type AlertSettingsUpdate,
} from '@field-note/shared';

import type { DashboardService } from '../dashboard/dashboardService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

/**
 * @description 홈 대시보드·알림 설정 라우트. 회사 ID는 세션에서만 얻는다. 알림은 저장하지 않고 조회할 때 계산한다
 * @param registry 라우트 등록소
 * @param dashboard 대시보드 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerDashboardRoutes = (registry: RouteRegistry, dashboard?: DashboardService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, dashboard ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/dashboard',
      summary: '홈 대시보드 (오늘 투입·진행 프로젝트·위험·이번 주 인력·할 일과 켜 둔 알림)',
      auth: 'required',
      response: { status: 200, schema: dashboardResponseSchema },
      errors: [],
    },
    async ({ auth }) => dashboard!.get(auth!.companyId),
  );

  add(
    {
      method: 'get',
      path: '/company/alert-settings',
      summary: '알림 종류별 켜짐 여부 (설정하지 않은 종류는 켜짐)',
      auth: 'required',
      response: { status: 200, schema: alertSettingsSchema },
      errors: [],
    },
    async ({ auth }) => dashboard!.getSettings(auth!.companyId),
  );

  add(
    {
      method: 'put',
      path: '/company/alert-settings',
      summary: '알림 종류별 켜고 끄기 (보낸 종류만 바꿈)',
      auth: 'required',
      request: { body: alertSettingsUpdateSchema },
      response: { status: 200, schema: alertSettingsSchema },
      errors: [],
    },
    async ({ auth, body }) => dashboard!.saveSettings(auth!.companyId, body as AlertSettingsUpdate),
    // 알림 숨기기는 활동 기록이 아니다 (데이터를 바꾸는 일이 아니라 화면 정리)
  );

  add(
    {
      method: 'post',
      path: '/alerts/dismiss',
      summary:
        '알림 숨기기 (알림 키를 남겨 조건이 바뀌기 전까지 보이지 않게 함, 모두 숨기기도 같은 요청)',
      auth: 'required',
      request: { body: alertDismissSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: [],
    },
    async ({ auth, body }) => {
      await dashboard!.dismiss(auth!.companyId, auth!.userId, body as AlertDismiss);

      return { success: true };
    },
  );
};
