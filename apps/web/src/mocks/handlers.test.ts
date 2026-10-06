import {
  companySettingsSchema,
  devicesResponseSchema,
  errorResponseSchema,
  invitationResponseSchema,
  meResponseSchema,
  signupResponseSchema,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { DEMO_ACCOUNTS, DEMO_INVITATION, LEGAL_DOCUMENTS, MOCK_EMAIL_CODE } from './data';
import { handlers } from './handlers';
import { resetMockState } from './state';

// 목업 응답이 서버 계약(공유 스키마)을 지키는지 검사: 목업과 실제 API가 어긋나면 화면만 통과하는 일을 막음
// 핸들러 경로는 상대 경로라 Node에서는 기준 주소(location)가 필요
Object.defineProperty(globalThis, 'location', {
  value: new URL('http://localhost/'),
  configurable: true,
});

const server = setupServer(...handlers);
// openapi-fetch는 생성 시점의 fetch를 붙잡으므로 msw가 fetch를 가로챈 뒤에 만든다
let client: ReturnType<typeof createApiClient>;
const demo = DEMO_ACCOUNTS[0]!;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  client = createApiClient('http://localhost');
});
afterEach(() => resetMockState());
afterAll(() => server.close());

const login = (loginId = demo.loginId, password = demo.password) =>
  client.POST('/api/v1/auth/login', { body: { loginId, password, isRemembered: true } });

describe('목업 서버 계약', () => {
  it('초대 링크 확인 응답이 계약과 같다', async () => {
    const { data } = await client.GET('/api/v1/invitations/{token}', {
      params: { path: { token: DEMO_INVITATION.token } },
    });

    expect(invitationResponseSchema.parse(data).documents).toHaveLength(LEGAL_DOCUMENTS.length);
  });

  it('없는 초대 링크는 공통 오류 형식의 404', async () => {
    const { error, response } = await client.GET('/api/v1/invitations/{token}', {
      params: { path: { token: 'expired-invite-0001' } },
    });

    expect(response.status).toBe(404);
    expect(errorResponseSchema.parse(error).error.code).toBe('NOT_FOUND');
  });

  it('로그인하면 정보를 얻고 회사·계정 식별값은 응답에 없다', async () => {
    const { data } = await login();
    const me = meResponseSchema.parse(data);

    expect(me.companyName).toBe('한빛판금');
    expect(JSON.stringify(data)).not.toMatch(/companyId|userId/);
  });

  it('틀린 비밀번호와 없는 아이디는 같은 오류로 응답한다', async () => {
    const wrongPassword = await login(demo.loginId, 'wrong-password-1');
    const unknownId = await login('nobody', 'wrong-password-1');

    expect(wrongPassword.response.status).toBe(401);
    expect(unknownId.error).toEqual(wrongPassword.error);
  });

  it('로그인 잠금 시연 계정은 423', async () => {
    const { response } = await login('locked', 'whatever-password');

    expect(response.status).toBe(423);
  });

  it('연속 5번 틀리면 잠기고 맞는 비밀번호도 거부한다 (실제 서버와 같은 정책)', async () => {
    let last = 0;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      last = (await login(demo.loginId, 'wrong-password-1')).response.status;
    }

    expect(last).toBe(423);
    expect((await login()).response.status).toBe(423);
  });

  it('로그인에 성공하면 실패 횟수가 초기화된다', async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await login(demo.loginId, 'wrong-password-1');
    }

    expect((await login()).response.status).toBe(200);
    expect((await login(demo.loginId, 'wrong-password-1')).response.status).toBe(401);
  });

  it('로그인 전에는 보호된 API가 401', async () => {
    const { response } = await client.GET('/api/v1/me');

    expect(response.status).toBe(401);
  });

  it('쓰기 요청에 CSRF 헤더가 없으면 403 (웹 클라이언트 회귀 방지)', async () => {
    const response = await fetch('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: demo.loginId, password: demo.password }),
    });

    expect(response.status).toBe(403);
  });

  it('가입 → 이메일 인증 → 로그인 정보 확인 흐름', async () => {
    const consents = LEGAL_DOCUMENTS.map((document) => ({
      documentId: document.id,
      isAgreed: document.isRequired,
    }));
    const signup = await client.POST('/api/v1/auth/signup', {
      body: {
        inviteToken: DEMO_INVITATION.token,
        loginId: 'daon-wood',
        password: 'Daon-demo-2026!',
        email: 'daon@example.com',
        isAgeConfirmed: true,
        consents,
      },
    });

    expect(signupResponseSchema.parse(signup.data).resendAfterSeconds).toBe(30);
    expect(meResponseSchema.parse((await client.GET('/api/v1/me')).data).isEmailVerified).toBe(
      false,
    );

    const wrong = await client.POST('/api/v1/auth/email/verify', { body: { code: '000000' } });

    expect(wrong.response.status).toBe(400);

    const verified = await client.POST('/api/v1/auth/email/verify', {
      body: { code: MOCK_EMAIL_CODE },
    });

    expect(meResponseSchema.parse(verified.data).isEmailVerified).toBe(true);
  });

  it('필수 약관에 동의하지 않으면 가입할 수 없다', async () => {
    const { response } = await client.POST('/api/v1/auth/signup', {
      body: {
        inviteToken: DEMO_INVITATION.token,
        loginId: 'daon-wood',
        password: 'Daon-demo-2026!',
        email: 'daon@example.com',
        isAgeConfirmed: true,
        consents: [],
      },
    });

    expect(response.status).toBe(400);
  });

  it('이미 쓰는 아이디는 409', async () => {
    const { response } = await client.POST('/api/v1/auth/signup', {
      body: {
        inviteToken: DEMO_INVITATION.token,
        loginId: demo.loginId,
        password: 'Daon-demo-2026!',
        email: 'daon@example.com',
        isAgeConfirmed: true,
        consents: LEGAL_DOCUMENTS.map((document) => ({ documentId: document.id, isAgreed: true })),
      },
    });

    expect(response.status).toBe(409);
  });

  it('회사 설정을 바꾸면 다시 조회할 때 반영된다', async () => {
    await login();
    const next = { standardWorkMinutes: 420, monthlyWorkDays: 20, workUnitMode: 'HOURS' as const };

    await client.PUT('/api/v1/company/settings', { body: next });

    expect(
      companySettingsSchema.parse((await client.GET('/api/v1/company/settings')).data),
    ).toEqual(next);
  });

  it('기기 원격 로그아웃은 현재 기기를 제외한 기기만 지운다', async () => {
    await login();
    const list = devicesResponseSchema.parse((await client.GET('/api/v1/me/devices')).data);
    const other = list.devices.find((device) => !device.isCurrent)!;

    expect(
      (await client.DELETE('/api/v1/me/devices/{id}', { params: { path: { id: other.id } } }))
        .response.status,
    ).toBe(200);
    expect(
      (
        await client.DELETE('/api/v1/me/devices/{id}', {
          params: { path: { id: 'device-current' } },
        })
      ).response.status,
    ).toBe(404);
  });
});
