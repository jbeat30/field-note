import {
  companySettingsSchema,
  deviceParamsSchema,
  devicesResponseSchema,
  emailResendResponseSchema,
  emailVerifyRequestSchema,
  invitationParamsSchema,
  invitationResponseSchema,
  loginRequestSchema,
  meResponseSchema,
  signupRequestSchema,
  signupResponseSchema,
  successResponseSchema,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

// 계약 선행 라우트: 화면은 이 계약(OpenAPI)으로 목업과 함께 먼저 만들고, 실제 구현은 P0-2~P0-8에서 채운다
const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

export const registerAccountRoutes = ({ add }: RouteRegistry) => {
  add(
    {
      method: 'get',
      path: '/invitations/{token}',
      summary: '초대 링크 확인 (가입 화면 진입)',
      auth: 'none',
      request: { params: invitationParamsSchema },
      response: { status: 200, schema: invitationResponseSchema },
      // 만료·사용 완료·존재하지 않는 링크는 구분하지 않음
      errors: ['NOT_FOUND'],
      rateLimit: { windowMs: 60_000, limit: 30 },
    },
    notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/auth/signup',
      summary: '초대 링크로 가입 (약관 동의·만 14세 확인)',
      auth: 'none',
      request: { body: signupRequestSchema },
      response: { status: 201, schema: signupResponseSchema },
      errors: ['NOT_FOUND', 'LOGIN_ID_TAKEN'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/auth/email/verify',
      summary: '이메일 인증 코드 확인 (가입 완료)',
      auth: 'required',
      request: { body: emailVerifyRequestSchema },
      response: { status: 200, schema: meResponseSchema },
      errors: ['EMAIL_CODE_INVALID'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/auth/email/resend',
      summary: '이메일 인증 코드 재발송',
      auth: 'required',
      response: { status: 200, schema: emailResendResponseSchema },
      rateLimit: { windowMs: 60_000, limit: 3 },
    },
    notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/auth/login',
      summary: '아이디 로그인',
      auth: 'none',
      request: { body: loginRequestSchema },
      response: { status: 200, schema: meResponseSchema },
      errors: ['INVALID_CREDENTIALS', 'ACCOUNT_LOCKED'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    notImplemented,
  );

  add(
    {
      method: 'get',
      path: '/me',
      summary: '로그인한 관리자 정보',
      auth: 'required',
      response: { status: 200, schema: meResponseSchema },
    },
    notImplemented,
  );

  add(
    {
      method: 'get',
      path: '/company/settings',
      summary: '회사 설정 조회 (기준시간·월 기준일수·공수 방식)',
      auth: 'required',
      response: { status: 200, schema: companySettingsSchema },
    },
    notImplemented,
  );

  add(
    {
      method: 'put',
      path: '/company/settings',
      summary: '회사 설정 변경',
      auth: 'required',
      request: { body: companySettingsSchema },
      response: { status: 200, schema: companySettingsSchema },
    },
    notImplemented,
  );

  add(
    {
      method: 'get',
      path: '/me/devices',
      summary: '로그인 기기 목록',
      auth: 'required',
      response: { status: 200, schema: devicesResponseSchema },
    },
    notImplemented,
  );

  add(
    {
      method: 'delete',
      path: '/me/devices/{id}',
      summary: '기기 원격 로그아웃',
      auth: 'required',
      request: { params: deviceParamsSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['NOT_FOUND'],
    },
    notImplemented,
  );
};
