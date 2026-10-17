import {
  errorResponseSchema,
  totpRecoveryCodesResponseSchema,
  totpSetupResponseSchema,
  totpStatusSchema,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { DEMO_ACCOUNTS, MOCK_RESET_TOKEN, MOCK_TOTP_CODE } from './data';
import { handlers } from './handlers';
import { resetMockState } from './state';

// 핸들러 경로는 상대 경로이므로 Node에서는 기준 주소(location) 필요
Object.defineProperty(globalThis, 'location', {
  value: new URL('http://localhost/'),
  configurable: true,
});

const server = setupServer(...handlers);
let client: ReturnType<typeof createApiClient>;
const demo = DEMO_ACCOUNTS[0]!;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  client = createApiClient('http://localhost');
});
afterEach(() => resetMockState());
afterAll(() => server.close());

const login = (totpCode?: string) =>
  client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true, totpCode },
  });

const errorCode = (error: unknown) => errorResponseSchema.parse(error).error.code;

// 로그인한 뒤 2단계 인증을 켜고 복구 코드를 돌려줌
const enable = async () => {
  await login();
  await client.POST('/api/v1/me/totp/setup');

  const { data } = await client.POST('/api/v1/me/totp/enable', { body: { code: MOCK_TOTP_CODE } });

  return totpRecoveryCodesResponseSchema.parse(data).recoveryCodes;
};

describe('2단계 인증 목업 계약', () => {
  it('로그인 없이는 모든 경로가 401이다', async () => {
    expect((await client.GET('/api/v1/me/totp')).response.status).toBe(401);
    expect((await client.POST('/api/v1/me/totp/setup')).response.status).toBe(401);
  });

  it('꺼진 상태에서 시작해 등록 확인에 성공하면 켜지고 복구 코드를 준다', async () => {
    await login();

    const before = await client.GET('/api/v1/me/totp');

    expect(totpStatusSchema.parse(before.data)).toEqual({ isEnabled: false, recoveryCodesLeft: 0 });

    const setup = await client.POST('/api/v1/me/totp/setup');

    expect(totpSetupResponseSchema.parse(setup.data).otpauthUrl).toContain('otpauth://totp/');

    const wrong = await client.POST('/api/v1/me/totp/enable', { body: { code: '000000' } });

    expect(errorCode(wrong.error)).toBe('TOTP_INVALID');

    const recoveryCodes = await enable();

    expect(recoveryCodes).toHaveLength(8);
    expect(totpStatusSchema.parse((await client.GET('/api/v1/me/totp')).data)).toEqual({
      isEnabled: true,
      recoveryCodesLeft: 8,
    });
  });

  it('시작하지 않고 확인하거나 이미 켠 뒤 다시 시작하면 거부한다', async () => {
    await login();

    expect(
      (await client.POST('/api/v1/me/totp/enable', { body: { code: MOCK_TOTP_CODE } })).response
        .status,
    ).toBe(400);

    await enable();

    expect((await client.POST('/api/v1/me/totp/setup')).response.status).toBe(400);
  });

  it('켠 계정은 코드 없이 로그인할 수 없고 코드가 맞아야 통과한다 (복구 코드는 한 번만)', async () => {
    const [recovery] = await enable();

    await client.POST('/api/v1/auth/logout');

    expect(errorCode((await login()).error)).toBe('TOTP_REQUIRED');
    expect(errorCode((await login('000000')).error)).toBe('TOTP_INVALID');
    expect((await login(MOCK_TOTP_CODE)).response.status).toBe(200);

    await client.POST('/api/v1/auth/logout');

    expect((await login(recovery)).response.status).toBe(200);

    await client.POST('/api/v1/auth/logout');

    expect(errorCode((await login(recovery)).error)).toBe('TOTP_INVALID');
  });

  it('끄려면 현재 비밀번호와 코드가 맞아야 하고, 끄면 코드 없이 로그인된다', async () => {
    await enable();

    const wrongPassword = await client.POST('/api/v1/me/totp/disable', {
      body: { currentPassword: 'wrong-password-1', code: MOCK_TOTP_CODE },
    });

    expect(errorCode(wrongPassword.error)).toBe('CURRENT_PASSWORD_INVALID');

    const wrongCode = await client.POST('/api/v1/me/totp/disable', {
      body: { currentPassword: demo.password, code: '000000' },
    });

    expect(errorCode(wrongCode.error)).toBe('TOTP_INVALID');
    expect(
      (
        await client.POST('/api/v1/me/totp/disable', {
          body: { currentPassword: demo.password, code: MOCK_TOTP_CODE },
        })
      ).response.status,
    ).toBe(200);

    await client.POST('/api/v1/auth/logout');

    expect((await login()).response.status).toBe(200);
  });

  it('복구 코드를 다시 받으면 이전 코드는 쓸 수 없다', async () => {
    const [old] = await enable();
    const regenerated = await client.POST('/api/v1/me/totp/recovery-codes', {
      body: { code: MOCK_TOTP_CODE },
    });
    const fresh = totpRecoveryCodesResponseSchema.parse(regenerated.data).recoveryCodes;

    expect(fresh).toHaveLength(8);
    expect(fresh).not.toContain(old);

    await client.POST('/api/v1/auth/logout');

    expect(errorCode((await login(old)).error)).toBe('TOTP_INVALID');
    expect((await login(fresh[0])).response.status).toBe(200);
  });

  it('틀린 코드도 로그인 실패 횟수에 쌓여 5번이면 잠긴다', async () => {
    await enable();
    await client.POST('/api/v1/auth/logout');

    for (let attempt = 1; attempt < 5; attempt += 1) {
      expect(errorCode((await login('000000')).error)).toBe('TOTP_INVALID');
    }

    expect(errorCode((await login('000000')).error)).toBe('ACCOUNT_LOCKED');
  });

  it('비밀번호 재설정: 켠 계정의 링크는 코드를 요구하고 틀려도 링크는 소모되지 않는다', async () => {
    await enable();
    await client.POST('/api/v1/auth/password-reset/request', { body: { email: demo.email } });

    const link = await client.GET('/api/v1/auth/password-reset/{token}', {
      params: { path: { token: MOCK_RESET_TOKEN } },
    });

    expect(link.data).toEqual({ success: true, requiresTotp: true });

    const body = { token: MOCK_RESET_TOKEN, newPassword: 'Brand-new-2026!' };

    expect(
      errorCode((await client.POST('/api/v1/auth/password-reset/confirm', { body })).error),
    ).toBe('TOTP_REQUIRED');
    expect(
      errorCode(
        (
          await client.POST('/api/v1/auth/password-reset/confirm', {
            body: { ...body, totpCode: '000000' },
          })
        ).error,
      ),
    ).toBe('TOTP_INVALID');
    expect(
      (
        await client.POST('/api/v1/auth/password-reset/confirm', {
          body: { ...body, totpCode: MOCK_TOTP_CODE },
        })
      ).response.status,
    ).toBe(200);
  });
});
