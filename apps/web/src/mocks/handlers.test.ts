import {
  companySettingsSchema,
  devicesResponseSchema,
  closureResponseSchema,
  errorResponseSchema,
  invitationResponseSchema,
  meResponseSchema,
  EMPLOYEE_STATUSES,
  employeeDetailSchema,
  employeesResponseSchema,
  OPTION_KINDS,
  OPTION_PRESETS,
  PARTNER_KINDS,
  projectDetailSchema,
  projectsResponseSchema,
  assignmentSchema,
  workLogRevisionsSchema,
  workLogSchema,
  workLogsResponseSchema,
  assignmentsResponseSchema,
  projectPeriodHistorySchema,
  projectStatusHistorySchema,
  type ProjectStatus,
  partnerDetailSchema,
  partnersResponseSchema,
  optionItemSchema,
  optionsResponseSchema,
  signupResponseSchema,
  todayInSeoul,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import {
  DEMO_ACCOUNTS,
  DEMO_INVITATION,
  LEGAL_DOCUMENTS,
  MOCK_EMAIL_CODE,
  MOCK_CLOSURE_TOKEN,
  MOCK_RESET_TOKEN,
} from './data';
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

  it('비밀번호 재설정: 가입 여부와 관계없이 같은 응답, 링크는 한 번만 쓰고 모든 기기가 로그아웃된다', async () => {
    await login();

    const known = await client.POST('/api/v1/auth/password-reset/request', {
      body: { email: demo.email },
    });
    const unknown = await client.POST('/api/v1/auth/password-reset/request', {
      body: { email: 'nobody@example.com' },
    });

    expect(known.response.status).toBe(200);
    expect(unknown.data).toEqual(known.data);

    const check = await client.GET('/api/v1/auth/password-reset/{token}', {
      params: { path: { token: MOCK_RESET_TOKEN } },
    });

    expect(check.response.status).toBe(200);

    await client.POST('/api/v1/auth/password-reset/request', { body: { email: demo.email } });
    const confirmed = await client.POST('/api/v1/auth/password-reset/confirm', {
      body: { token: MOCK_RESET_TOKEN, newPassword: 'Brand-new-2026!' },
    });

    expect(confirmed.response.status).toBe(200);
    expect((await client.GET('/api/v1/me')).response.status).toBe(401);
    expect((await login(demo.loginId, demo.password)).response.status).toBe(401);
    expect((await login(demo.loginId, 'Brand-new-2026!')).response.status).toBe(200);
    expect(
      (
        await client.POST('/api/v1/auth/password-reset/confirm', {
          body: { token: MOCK_RESET_TOKEN, newPassword: 'Another-2026-pass!' },
        })
      ).response.status,
    ).toBe(404);
  });

  it('계정 해지: 비밀번호를 확인하고, 요청하면 로그아웃·로그인 차단, 링크로 취소하면 복구된다', async () => {
    await login();

    const noPassword = await client.POST('/api/v1/me/closure', { body: {} });
    const wrong = await client.POST('/api/v1/me/closure', {
      body: { currentPassword: 'wrong-password-1' },
    });

    expect(noPassword.response.status).toBe(400);
    expect(errorResponseSchema.parse(wrong.error).error.code).toBe('CURRENT_PASSWORD_INVALID');
    // 요청 전에는 링크가 없음
    expect(
      (
        await client.GET('/api/v1/auth/closure/{token}', {
          params: { path: { token: MOCK_CLOSURE_TOKEN } },
        })
      ).response.status,
    ).toBe(404);

    const requested = await client.POST('/api/v1/me/closure', {
      body: { currentPassword: demo.password },
    });

    expect(closureResponseSchema.parse(requested.data).purgeAfter).toBeDefined();
    expect((await client.GET('/api/v1/me')).response.status).toBe(401);

    const blocked = await login(demo.loginId, demo.password);

    expect(blocked.response.status).toBe(403);
    expect(errorResponseSchema.parse(blocked.error).error.code).toBe('ACCOUNT_CLOSING');
    expect((await login(demo.loginId, 'wrong-password-1')).response.status).toBe(401);

    const check = await client.GET('/api/v1/auth/closure/{token}', {
      params: { path: { token: MOCK_CLOSURE_TOKEN } },
    });

    expect(closureResponseSchema.parse(check.data).purgeAfter).toBe(
      closureResponseSchema.parse(requested.data).purgeAfter,
    );
    expect(
      (await client.POST('/api/v1/auth/closure/cancel', { body: { token: MOCK_CLOSURE_TOKEN } }))
        .response.status,
    ).toBe(200);
    expect((await login()).response.status).toBe(200);
    expect(
      (await client.POST('/api/v1/auth/closure/cancel', { body: { token: MOCK_CLOSURE_TOKEN } }))
        .response.status,
    ).toBe(404);
  });

  it('선택 목록: 처음에는 프리셋, 추가·이름 변경·숨기기·순서 변경과 중복·격리 규칙이 서버와 같다', async () => {
    expect((await client.GET('/api/v1/company/options')).response.status).toBe(401);

    await login();

    const first = optionsResponseSchema.parse((await client.GET('/api/v1/company/options')).data);

    for (const kind of OPTION_KINDS) {
      expect(first.items.filter((item) => item.kind === kind).map((item) => item.name)).toEqual(
        OPTION_PRESETS[kind],
      );
    }

    const created = await client.POST('/api/v1/company/options', {
      body: { kind: 'TRADE', name: '  도장 ' },
    });

    expect(created.response.status).toBe(201);
    expect(optionItemSchema.parse(created.data)).toMatchObject({ name: '도장', isActive: true });

    const duplicate = await client.POST('/api/v1/company/options', {
      body: { kind: 'TRADE', name: ' 판금 ' },
    });

    expect(duplicate.response.status).toBe(400);
    expect(errorResponseSchema.parse(duplicate.error).error.details?.[0]?.path).toBe('body.name');
    expect(
      (await client.POST('/api/v1/company/options', { body: { kind: 'JOB_TYPE', name: '도장' } }))
        .response.status,
    ).toBe(201);

    const id = created.data!.id;
    const renamed = await client.PATCH('/api/v1/company/options/{id}', {
      params: { path: { id } },
      body: { name: '도장공' },
    });

    expect(optionItemSchema.parse(renamed.data).name).toBe('도장공');
    expect(
      (
        await client.PATCH('/api/v1/company/options/{id}', {
          params: { path: { id } },
          body: { isActive: false },
        })
      ).data?.isActive,
    ).toBe(false);
    expect(
      (
        await client.PATCH('/api/v1/company/options/{id}', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000999' } },
          body: { isActive: false },
        })
      ).response.status,
    ).toBe(404);

    const trades = optionsResponseSchema
      .parse((await client.GET('/api/v1/company/options')).data)
      .items.filter((item) => item.kind === 'TRADE');
    const reversed = [...trades].reverse().map((item) => item.id);

    expect(
      (
        await client.PUT('/api/v1/company/options/order', {
          body: { kind: 'TRADE', ids: reversed },
        })
      ).response.status,
    ).toBe(200);
    expect(
      optionsResponseSchema
        .parse((await client.GET('/api/v1/company/options')).data)
        .items.filter((item) => item.kind === 'TRADE')
        .map((item) => item.id),
    ).toEqual(reversed);
    expect(
      (
        await client.PUT('/api/v1/company/options/order', {
          body: { kind: 'TRADE', ids: reversed.slice(1) },
        })
      ).response.status,
    ).toBe(400);
    // 목업 서버가 호출마다 지연을 흉내 내므로 호출이 많은 이 시험은 제한 시간을 늘림
  }, 30_000);

  it('직원: 이름만으로 등록, 목록엔 개인정보 제외, 퇴사·재입사·검증 규칙이 서버와 같다', async () => {
    expect((await client.GET('/api/v1/employees')).response.status).toBe(401);

    await login();

    const listed = await client.GET('/api/v1/employees');
    const list = employeesResponseSchema.parse(listed.data);

    expect(list.items.length).toBeGreaterThan(0);
    // 목록에는 생년월일·연락처·메모가 없고, 재직 → 휴직 → 퇴사 순
    expect(JSON.stringify(listed.data)).not.toMatch(/birthDate|phone|memo/);
    expect(list.items.map((item) => item.status)).toEqual(
      [...list.items.map((item) => item.status)].sort(
        (a, b) => EMPLOYEE_STATUSES.indexOf(a) - EMPLOYEE_STATUSES.indexOf(b),
      ),
    );

    const created = await client.POST('/api/v1/employees', { body: { name: '  신입 ' } });
    const card = employeeDetailSchema.parse(created.data);

    expect(created.response.status).toBe(201);
    expect(card).toMatchObject({ name: '신입', status: 'ACTIVE', jobTypeId: null, phone: null });

    const options = optionsResponseSchema.parse(
      (await client.GET('/api/v1/company/options')).data,
    ).items;
    const jobId = options.find((item) => item.kind === 'JOB_TYPE')!.id;
    const workId = options.find((item) => item.kind === 'WORK_CATEGORY')!.id;

    // 직종 자리에 다른 종류 항목, 없는 항목, 형식이 틀린 값은 거부
    for (const body of [
      { name: '김', jobTypeId: workId },
      { name: '김', jobTypeId: '0198d000-0000-7000-8000-000000000999' },
      { name: '김', phone: 'abc' },
      { name: '김', birthDate: '2999-01-01' },
      { name: '   ' },
    ]) {
      expect((await client.POST('/api/v1/employees', { body })).response.status).toBe(400);
    }

    const patched = await client.PATCH('/api/v1/employees/{id}', {
      params: { path: { id: card.id } },
      body: { jobTypeId: jobId, title: '반장', phone: '010-1111-2222' },
    });

    expect(employeeDetailSchema.parse(patched.data)).toMatchObject({
      jobTypeId: jobId,
      title: '반장',
    });

    const cleared = await client.PATCH('/api/v1/employees/{id}', {
      params: { path: { id: card.id } },
      body: { title: null, phone: null },
    });

    expect(employeeDetailSchema.parse(cleared.data)).toMatchObject({
      title: null,
      phone: null,
      jobTypeId: jobId,
    });

    // 퇴사하면 퇴사일이 채워지고, 재입사하면 지워진다
    const left = employeeDetailSchema.parse(
      (
        await client.PATCH('/api/v1/employees/{id}', {
          params: { path: { id: card.id } },
          body: { status: 'LEFT' },
        })
      ).data,
    );

    expect(left).toMatchObject({ status: 'LEFT', leftOn: todayInSeoul(new Date()) });
    expect(
      (
        await client.PATCH('/api/v1/employees/{id}', {
          params: { path: { id: card.id } },
          body: { leftOn: null },
        })
      ).response.status,
    ).toBe(400);
    expect(
      employeeDetailSchema.parse(
        (
          await client.PATCH('/api/v1/employees/{id}', {
            params: { path: { id: card.id } },
            body: { status: 'ACTIVE' },
          })
        ).data,
      ),
    ).toMatchObject({ status: 'ACTIVE', leftOn: null });
    expect(
      (
        await client.GET('/api/v1/employees/{id}', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000999' } },
        })
      ).response.status,
    ).toBe(404);

    const filtered = await client.GET('/api/v1/employees', {
      params: { query: { status: 'LEFT' } },
    });

    expect(
      employeesResponseSchema.parse(filtered.data).items.every((item) => item.status === 'LEFT'),
    ).toBe(true);
    // 목업 서버가 호출마다 지연을 흉내 내므로 호출이 많은 이 시험은 제한 시간을 늘림
  }, 60_000);

  it('명부: 구분·상호만으로 등록, 목록엔 연락처 제외, 구분별 중복·숨기기 규칙이 서버와 같다', async () => {
    expect((await client.GET('/api/v1/partners')).response.status).toBe(401);

    await login();

    const listed = await client.GET('/api/v1/partners');
    const list = partnersResponseSchema.parse(listed.data);

    expect(list.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(listed.data)).not.toMatch(/phone|memo/);
    // 구분 순서(고객 → 협력업체 → 공급처)
    expect(list.items.map((item) => item.kind)).toEqual(
      [...list.items.map((item) => item.kind)].sort(
        (a, b) => PARTNER_KINDS.indexOf(a) - PARTNER_KINDS.indexOf(b),
      ),
    );

    const created = await client.POST('/api/v1/partners', {
      body: { kind: 'CLIENT', name: '  신규고객 ' },
    });
    const card = partnerDetailSchema.parse(created.data);

    expect(created.response.status).toBe(201);
    expect(card).toMatchObject({ name: '신규고객', isActive: true, phone: null });

    // 같은 구분의 같은 상호(공백·대소문자 차이 포함)는 거부, 다른 구분은 허용
    expect(
      (await client.POST('/api/v1/partners', { body: { kind: 'CLIENT', name: ' 신규 고객' } }))
        .response.status,
    ).toBe(201);
    expect(
      (await client.POST('/api/v1/partners', { body: { kind: 'CLIENT', name: '신규  고객 ' } }))
        .response.status,
    ).toBe(400);
    expect(
      (await client.POST('/api/v1/partners', { body: { kind: 'SUPPLIER', name: '신규고객' } }))
        .response.status,
    ).toBe(201);

    for (const body of [
      { kind: 'CLIENT', name: '   ' },
      { kind: 'CLIENT', name: '가', phone: 'abc' },
      { name: '가' },
    ]) {
      expect((await client.POST('/api/v1/partners', { body: body as never })).response.status).toBe(
        400,
      );
    }

    const patched = await client.PATCH('/api/v1/partners/{id}', {
      params: { path: { id: card.id } },
      body: { contactName: '담당', phone: '02-111-2222', isActive: false },
    });

    expect(partnerDetailSchema.parse(patched.data)).toMatchObject({
      contactName: '담당',
      isActive: false,
    });

    const cleared = await client.PATCH('/api/v1/partners/{id}', {
      params: { path: { id: card.id } },
      body: { contactName: null, phone: null },
    });

    expect(partnerDetailSchema.parse(cleared.data)).toMatchObject({
      contactName: null,
      phone: null,
      isActive: false,
    });
    expect(
      (
        await client.PATCH('/api/v1/partners/{id}', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000999' } },
          body: { name: '가' },
        })
      ).response.status,
    ).toBe(404);
    expect(
      partnersResponseSchema
        .parse(
          (await client.GET('/api/v1/partners', { params: { query: { kind: 'SUPPLIER' } } })).data,
        )
        .items.every((item) => item.kind === 'SUPPLIER'),
    ).toBe(true);
    // 목업 서버가 호출마다 지연을 흉내 내므로 호출이 많은 이 시험은 제한 시간을 늘림
  }, 60_000);

  it('프로젝트: 코드 자동 번호, 필수 항목·참조 검사, 필터와 수정 규칙이 서버와 같다', async () => {
    expect((await client.GET('/api/v1/projects')).response.status).toBe(401);

    await login();

    const listed = projectsResponseSchema.parse((await client.GET('/api/v1/projects')).data);
    const options = optionsResponseSchema.parse(
      (await client.GET('/api/v1/company/options')).data,
    ).items;
    const partners = partnersResponseSchema.parse(
      (await client.GET('/api/v1/partners')).data,
    ).items;
    const employees = employeesResponseSchema.parse(
      (await client.GET('/api/v1/employees')).data,
    ).items;
    const clientId = partners.find((item) => item.kind === 'CLIENT' && item.isActive)!.id;
    const supplierId = partners.find((item) => item.kind === 'SUPPLIER')!.id;
    const managerId = employees.find((item) => item.status === 'ACTIVE')!.id;
    const leftId = employees.find((item) => item.status === 'LEFT')!.id;
    const trade = options.find((item) => item.kind === 'TRADE')!.id;
    const body = {
      name: '  새 프로젝트 ',
      siteName: '새 현장',
      clientId,
      managerId,
      contractDate: '2026-10-01',
      plannedStart: '2026-10-10',
      plannedEnd: '2026-12-31',
    };

    // 최근 등록순(코드 숫자 순서), 목록에는 현장 연락처·출입 메모·계약일이 없다
    expect(JSON.stringify(listed)).not.toMatch(/siteContact|accessMemo|contractDate/);
    expect(listed.items.length).toBeGreaterThan(0);

    const created = await client.POST('/api/v1/projects', { body: { ...body, tradeIds: [trade] } });
    const card = projectDetailSchema.parse(created.data);

    expect(created.response.status).toBe(201);
    expect(card).toMatchObject({ name: '새 프로젝트', status: 'PLANNED', tradeIds: [trade] });
    expect(card.code).toMatch(/^\d{4}-\d{3,}$/);

    const second = projectDetailSchema.parse(
      (await client.POST('/api/v1/projects', { body: { ...body, name: '둘째' } })).data,
    );

    expect(Number(second.code.split('-')[1])).toBe(Number(card.code.split('-')[1]) + 1);

    // 필수 항목 누락·기간 순서·참조 규칙 위반은 거부
    for (const patch of [
      { name: '   ' },
      { plannedEnd: '2026-09-01' },
      { siteMapUrl: 'javascript:alert(1)' },
      { clientId: supplierId },
      { managerId: leftId },
      { tradeIds: [options.find((item) => item.kind === 'JOB_TYPE')!.id] },
    ]) {
      expect(
        (await client.POST('/api/v1/projects', { body: { ...body, ...patch } })).response.status,
      ).toBe(400);
    }

    const filtered = projectsResponseSchema.parse(
      (
        await client.GET('/api/v1/projects', {
          params: { query: { status: 'PLANNED', sort: 'name' } },
        })
      ).data,
    );

    expect(filtered.items.every((item) => item.status === 'PLANNED')).toBe(true);

    // 수정: 보낸 항목만 바꾸고 null로 비우며, 코드·상태는 바꿀 수 없다
    const patched = await client.PATCH('/api/v1/projects/{id}', {
      params: { path: { id: card.id } },
      body: { name: '고침', siteAddress: '주소', tradeIds: [] },
    });

    expect(projectDetailSchema.parse(patched.data)).toMatchObject({
      name: '고침',
      siteAddress: '주소',
      tradeIds: [],
      code: card.code,
      status: 'PLANNED',
    });
    expect(
      projectDetailSchema.parse(
        (
          await client.PATCH('/api/v1/projects/{id}', {
            params: { path: { id: card.id } },
            body: { siteAddress: null },
          })
        ).data,
      ).siteAddress,
    ).toBeNull();
    expect(
      (
        await client.PATCH('/api/v1/projects/{id}', {
          params: { path: { id: card.id } },
          body: { plannedEnd: '2026-01-01' },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await client.PATCH('/api/v1/projects/{id}', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000999' } },
          body: { name: '가' },
        })
      ).response.status,
    ).toBe(404);
    expect(
      (
        await client.GET('/api/v1/projects/{id}', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000999' } },
        })
      ).response.status,
    ).toBe(404);
    // 목업 서버가 호출마다 지연을 흉내 내므로 호출이 많은 이 시험은 제한 시간을 늘림
  }, 90_000);

  it('프로젝트 상태 전환: 허용된 전환만, 날짜·사유 규칙, 이력, 수정 제한이 서버와 같다', async () => {
    expect(
      (
        await client.POST('/api/v1/projects/{id}/status', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000302' } },
          body: { toStatus: 'IN_PROGRESS' },
        })
      ).response.status,
    ).toBe(401);

    await login();

    const planned = projectsResponseSchema.parse(
      (await client.GET('/api/v1/projects', { params: { query: { status: 'PLANNED' } } })).data,
    ).items[0]!;
    const path = { params: { path: { id: planned.id } } };
    const move = (body: {
      toStatus: ProjectStatus;
      effectiveOn?: string;
      reason?: string | null;
    }) => client.POST('/api/v1/projects/{id}/status', { ...path, body });

    // 허용되지 않은 전환, 미래 날짜, 사유 없는 취소는 거부
    for (const body of [
      { toStatus: 'COMPLETED' as const },
      { toStatus: 'SUSPENDED' as const, reason: '사유' },
      { toStatus: 'IN_PROGRESS' as const, effectiveOn: '2999-01-01' },
      { toStatus: 'CANCELLED' as const },
    ]) {
      expect((await move(body)).response.status).toBe(400);
    }

    const started = projectDetailSchema.parse(
      (await move({ toStatus: 'IN_PROGRESS', effectiveOn: '2026-10-01' })).data,
    );

    expect(started).toMatchObject({
      status: 'IN_PROGRESS',
      actualStart: '2026-10-01',
      actualEnd: null,
    });
    // 이전 변경일보다 빠른 날짜는 거부, 같은 날은 허용
    expect(
      (await move({ toStatus: 'SUSPENDED', effectiveOn: '2026-09-30', reason: '우천' })).response
        .status,
    ).toBe(400);
    expect(
      (await move({ toStatus: 'SUSPENDED', effectiveOn: '2026-10-01', reason: ' 우천 ' })).response
        .status,
    ).toBe(200);

    const resumed = projectDetailSchema.parse(
      (await move({ toStatus: 'IN_PROGRESS', effectiveOn: '2026-10-02' })).data,
    );

    expect(resumed.actualStart).toBe('2026-10-01');

    const completed = projectDetailSchema.parse(
      (await move({ toStatus: 'COMPLETED', effectiveOn: '2026-10-03' })).data,
    );

    expect(completed).toMatchObject({ status: 'COMPLETED', actualEnd: '2026-10-03' });
    expect((await move({ toStatus: 'IN_PROGRESS' })).response.status).toBe(400);

    const history = projectStatusHistorySchema.parse(
      (await client.GET('/api/v1/projects/{id}/status-history', path)).data,
    ).items;

    expect(history.map((item) => `${item.fromStatus}>${item.toStatus}`)).toEqual([
      'IN_PROGRESS>COMPLETED',
      'SUSPENDED>IN_PROGRESS',
      'IN_PROGRESS>SUSPENDED',
      'PLANNED>IN_PROGRESS',
    ]);
    expect(history.find((item) => item.toStatus === 'SUSPENDED')?.reason).toBe('우천');

    // 완료는 기본정보를 계속 수정할 수 있지만 취소하면 수정할 수 없다
    expect(
      (await client.PATCH('/api/v1/projects/{id}', { ...path, body: { name: '완료 후 수정' } }))
        .response.status,
    ).toBe(200);

    const other = projectsResponseSchema.parse(
      (await client.GET('/api/v1/projects', { params: { query: { status: 'IN_PROGRESS' } } })).data,
    ).items[0]!;

    await client.POST('/api/v1/projects/{id}/status', {
      params: { path: { id: other.id } },
      body: { toStatus: 'CANCELLED', reason: '계약 해지' },
    });
    expect(
      (
        await client.PATCH('/api/v1/projects/{id}', {
          params: { path: { id: other.id } },
          body: { name: '수정' },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await client.GET('/api/v1/projects/{id}/status-history', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000999' } },
        })
      ).response.status,
    ).toBe(404);
    // 목업 서버가 호출마다 지연을 흉내 내므로 호출이 많은 이 시험은 제한 시간을 늘림
  }, 120_000);

  it('투입: 프로젝트 기간 안, 겹침 경고, 상태별 허용, 취소 표시와 기간 변경 이력이 서버와 같다', async () => {
    expect(
      (
        await client.GET('/api/v1/projects/{id}/assignments', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000301' } },
        })
      ).response.status,
    ).toBe(401);

    await login();

    const projects = projectsResponseSchema.parse(
      (await client.GET('/api/v1/projects')).data,
    ).items;
    const employees = employeesResponseSchema.parse(
      (await client.GET('/api/v1/employees')).data,
    ).items;
    const planned = projects.find((item) => item.status === 'PLANNED')!;
    const running = projects.find((item) => item.status === 'IN_PROGRESS')!;
    const completed = projects.find((item) => item.status === 'COMPLETED')!;
    const left = employees.find((item) => item.status === 'LEFT')!;
    const onLeave = employees.find((item) => item.status === 'ON_LEAVE')!;
    const worker = employees.find((item) => item.status === 'ACTIVE' && item.name === '오전기')!;
    const path = (id: string) => ({ params: { path: { id } } });
    const assign = (id: string, body: object) =>
      client.POST('/api/v1/projects/{id}/assignments', { ...path(id), body: body as never });

    // 더미 투입(취소한 것 제외)이 목록에 있고 겹침 경고가 붙는다
    const seeded = assignmentsResponseSchema.parse(
      (await client.GET('/api/v1/projects/{id}/assignments', path(running.id))).data,
    ).items;

    expect(seeded.length).toBeGreaterThan(0);
    expect(seeded.some((item) => item.warnings.some((warning) => warning.type === 'OVERLAP'))).toBe(
      true,
    );
    expect(seeded.every((item) => item.cancelledAt === null)).toBe(true);

    const full = { startDate: planned.plannedStart, endDate: planned.plannedEnd };

    // 기간 밖·퇴사 직원·완료 프로젝트는 거부
    for (const [id, body] of [
      [planned.id, { employeeId: worker.id, startDate: '2000-01-01', endDate: planned.plannedEnd }],
      [
        planned.id,
        { employeeId: worker.id, startDate: planned.plannedStart, endDate: '2099-01-01' },
      ],
      [planned.id, { employeeId: left.id, ...full }],
      [
        completed.id,
        { employeeId: worker.id, startDate: completed.plannedStart, endDate: completed.plannedEnd },
      ],
    ] as const) {
      expect((await assign(id, body)).response.status).toBe(400);
    }

    const created = assignmentSchema.parse(
      (await assign(planned.id, { employeeId: worker.id, ...full, plannedMinutes: 960 })).data,
    );

    expect(created).toMatchObject({ plannedMinutes: 960, cancelledAt: null });
    // 같은 프로젝트에 같은 직원이 겹치게 다시 투입할 수 없다
    expect((await assign(planned.id, { employeeId: worker.id, ...full })).response.status).toBe(
      400,
    );
    // 휴직 직원은 경고와 함께 투입된다
    expect(
      assignmentSchema.parse((await assign(planned.id, { employeeId: onLeave.id, ...full })).data)
        .warnings,
    ).toEqual([{ type: 'ON_LEAVE' }]);

    const patched = assignmentSchema.parse(
      (
        await client.PATCH('/api/v1/projects/{id}/assignments/{assignmentId}', {
          params: { path: { id: planned.id, assignmentId: created.id } },
          body: { endDate: planned.plannedStart, plannedMinutes: null },
        })
      ).data,
    );

    expect(patched).toMatchObject({ endDate: planned.plannedStart, plannedMinutes: null });

    const cancelled = await client.POST('/api/v1/projects/{id}/assignments/{assignmentId}/cancel', {
      params: { path: { id: planned.id, assignmentId: created.id } },
      body: {},
    });

    expect(assignmentSchema.parse(cancelled.data).cancelledAt).not.toBeNull();
    expect(
      assignmentsResponseSchema
        .parse((await client.GET('/api/v1/projects/{id}/assignments', path(planned.id))).data)
        .items.some((item) => item.id === created.id),
    ).toBe(false);
    expect(
      assignmentsResponseSchema
        .parse(
          (
            await client.GET('/api/v1/projects/{id}/assignments', {
              params: { path: { id: planned.id }, query: { includeCancelled: 'true' } },
            })
          ).data,
        )
        .items.some((item) => item.id === created.id),
    ).toBe(true);

    // 예정 상태에서는 사유 없이 기간을 바꿀 수 있고 이력이 남으며, 시작한 프로젝트는 사유 필수·투입이 밖으로 나가면 거부
    expect(
      (
        await client.PATCH('/api/v1/projects/{id}', {
          ...path(planned.id),
          body: { plannedEnd: '2027-06-30' },
        })
      ).response.status,
    ).toBe(200);
    expect(
      projectPeriodHistorySchema.parse(
        (await client.GET('/api/v1/projects/{id}/period-history', path(planned.id))).data,
      ).items[0],
    ).toMatchObject({ toEnd: '2027-06-30', reason: null });
    expect(
      (
        await client.PATCH('/api/v1/projects/{id}', {
          ...path(running.id),
          body: { plannedEnd: '2027-01-31' },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await client.PATCH('/api/v1/projects/{id}', {
          ...path(running.id),
          body: { plannedEnd: '2026-08-01', periodChangeReason: '단축' },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await client.PATCH('/api/v1/projects/{id}', {
          ...path(running.id),
          body: { plannedEnd: '2027-01-31', periodChangeReason: '연장' },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (
        await client.GET(
          '/api/v1/projects/{id}/period-history',
          path('0198d000-0000-7000-8000-000000000999'),
        )
      ).response.status,
    ).toBe(404);
    // 목업 서버가 호출마다 지연을 흉내 내므로 호출이 많은 이 시험은 제한 시간을 늘림
  }, 120_000);

  it('작업일지: 임시 저장·저장, 낙관적 잠금, 수정 이력, 날짜·상태·투입·하루 합계 규칙이 서버와 같다', async () => {
    expect(
      (
        await client.GET('/api/v1/projects/{id}/work-logs', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000301' } },
        })
      ).response.status,
    ).toBe(401);

    await login();

    const projects = projectsResponseSchema.parse(
      (await client.GET('/api/v1/projects')).data,
    ).items;
    const employees = employeesResponseSchema.parse(
      (await client.GET('/api/v1/employees')).data,
    ).items;
    const options = optionsResponseSchema.parse(
      (await client.GET('/api/v1/company/options')).data,
    ).items;
    const running = projects.find((item) => item.code === '2026-001')!;
    const planned = projects.find((item) => item.status === 'PLANNED')!;
    const worker = employees.find((item) => item.name === '정판금')!;
    const stranger = employees.find((item) => item.name === '오전기')!;
    const category = options.find((item) => item.kind === 'WORK_CATEGORY' && item.name === '설치')!;
    const path = (workDate: string, id = running.id) => ({ params: { path: { id, workDate } } });
    const put = (workDate: string, body: object, id = running.id) =>
      client.PUT('/api/v1/projects/{id}/work-logs/{workDate}', {
        ...path(workDate, id),
        body: body as never,
      });
    const entries = [{ employeeId: worker.id, categoryId: category.id, minutes: 480 }];

    // 더미 일지: 임시 저장 1건 포함, 최근 날짜 순
    const listed = workLogsResponseSchema.parse(
      (
        await client.GET('/api/v1/projects/{id}/work-logs', {
          params: { path: { id: running.id }, query: {} },
        })
      ).data,
    ).items;

    expect(listed.length).toBeGreaterThanOrEqual(4);
    expect(listed.map((item) => item.workDate)).toEqual(
      [...listed.map((item) => item.workDate)].sort().reverse(),
    );
    expect(listed.some((item) => item.status === 'DRAFT')).toBe(true);

    // 하루 합계: 같은 날 다른 프로젝트에도 저장된 일지가 있는 직원은 경고
    const seeded = workLogSchema.parse(
      (await client.GET('/api/v1/projects/{id}/work-logs/{workDate}', path('2026-09-02'))).data,
    );

    expect(seeded).toMatchObject({ version: 2, isChange: true });
    expect(seeded.warnings.some((warning) => warning.type === 'DAILY_OVER')).toBe(true);
    expect(
      workLogRevisionsSchema.parse(
        (
          await client.GET(
            '/api/v1/projects/{id}/work-logs/{workDate}/revisions',
            path('2026-09-02'),
          )
        ).data,
      ).items,
    ).toHaveLength(1);

    // 날짜·상태 규칙
    expect(
      (await put('2026-06-01', { status: 'DRAFT', content: '', entries: [] })).response.status,
    ).toBe(400);
    expect(
      (await put('2999-01-01', { status: 'DRAFT', content: '', entries: [] })).response.status,
    ).toBe(400);
    expect(
      (await put('2026-09-05', { status: 'DRAFT', content: '', entries: [] }, planned.id)).response
        .status,
    ).toBe(400);
    expect(
      (await put('2026-09-05', { status: 'SAVED', content: '  ', entries })).response.status,
    ).toBe(400);

    // 임시 저장 → 저장 (낙관적 잠금), 투입 없는 직원은 확인 후 자동 추가
    const draft = workLogSchema.parse(
      (
        await put('2026-09-05', {
          status: 'DRAFT',
          content: '초안',
          entries: [{ employeeId: stranger.id, categoryId: category.id, minutes: 60 }],
        })
      ).data,
    );

    expect(draft).toMatchObject({ version: 1, savedAt: null });
    expect(
      (await put('2026-09-05', { status: 'DRAFT', content: '버전 없음', entries: [] })).response
        .status,
    ).toBe(409);

    const withStranger = {
      status: 'SAVED',
      content: '신규 작업',
      entries: [{ employeeId: stranger.id, categoryId: category.id, minutes: 60 }],
      expectedVersion: 1,
    };

    expect((await put('2026-09-05', withStranger)).response.status).toBe(400);

    const saved = workLogSchema.parse(
      (await put('2026-09-05', { ...withStranger, addMissingAssignments: true })).data,
    );

    expect(saved).toMatchObject({
      status: 'SAVED',
      version: 2,
      autoAssignedEmployeeIds: [stranger.id],
    });
    expect(saved.savedAt).not.toBeNull();
    // 저장된 일지를 임시 저장으로 되돌릴 수 없고, 고치면 이력이 남는다
    expect(
      (await put('2026-09-05', { status: 'DRAFT', content: '', entries: [], expectedVersion: 2 }))
        .response.status,
    ).toBe(400);
    expect(
      (await put('2026-09-05', { ...withStranger, content: '수정', expectedVersion: 1 })).response
        .status,
    ).toBe(409);
    expect(
      (await put('2026-09-05', { ...withStranger, content: '수정', expectedVersion: 2 })).data
        ?.version,
    ).toBe(3);
    expect(
      workLogRevisionsSchema.parse(
        (
          await client.GET(
            '/api/v1/projects/{id}/work-logs/{workDate}/revisions',
            path('2026-09-05'),
          )
        ).data,
      ).items[0]!.snapshot.content,
    ).toBe('신규 작업');
    expect(
      (await client.GET('/api/v1/projects/{id}/work-logs/{workDate}', path('2026-09-30'))).response
        .status,
    ).toBe(404);
    // 목업 서버가 호출마다 지연을 흉내 내므로 호출이 많은 이 시험은 제한 시간을 늘림
  }, 120_000);

  it('로그인 상태 비밀번호 변경: 현재 비밀번호가 틀리면 400, 맞으면 새 비밀번호로 로그인', async () => {
    await login();

    const wrong = await client.POST('/api/v1/me/password', {
      body: { currentPassword: 'wrong-password-1', newPassword: 'Changed-2026-pass!' },
    });

    expect(wrong.response.status).toBe(400);
    expect(errorResponseSchema.parse(wrong.error).error.code).toBe('CURRENT_PASSWORD_INVALID');

    const changed = await client.POST('/api/v1/me/password', {
      body: { currentPassword: demo.password, newPassword: 'Changed-2026-pass!' },
    });

    expect(changed.response.status).toBe(200);
    expect((await login(demo.loginId, 'Changed-2026-pass!')).response.status).toBe(200);
  });

  it('이메일 변경: 새 주소를 인증해야 반영되고 이미 쓰는 주소는 거부한다', async () => {
    await login();

    const taken = await client.POST('/api/v1/me/email/change', {
      body: { newEmail: DEMO_ACCOUNTS[1]!.email, currentPassword: demo.password },
    });

    expect(taken.response.status).toBe(400);

    const requested = await client.POST('/api/v1/me/email/change', {
      body: { newEmail: 'changed@example.com', currentPassword: demo.password },
    });

    expect(requested.response.status).toBe(200);
    // 인증 전에는 기존 이메일 유지
    expect(meResponseSchema.parse((await client.GET('/api/v1/me')).data).email).toBe(demo.email);

    await client.POST('/api/v1/auth/email/verify', { body: { code: MOCK_EMAIL_CODE } });

    expect(meResponseSchema.parse((await client.GET('/api/v1/me')).data).email).toBe(
      'changed@example.com',
    );
  });

  describe('카카오 로그인', () => {
    const complete = async (body: Record<string, unknown>) => {
      const response = await fetch('http://localhost/api/__mock/kakao/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return ((await response.json()) as { redirect: string }).redirect;
    };

    const agreedAll = LEGAL_DOCUMENTS.filter((document) => document.isRequired)
      .map((document) => document.id)
      .join(',');

    it('제공자 목록과 시작 주소를 돌려준다', async () => {
      expect((await client.GET('/api/v1/auth/social/providers')).data).toEqual({ kakao: true });

      const start = await client.POST('/api/v1/auth/kakao/start', { body: { purpose: 'login' } });

      expect(start.data?.url).toBe('/mock-kakao?purpose=login');
    });

    it('연동하지 않은 카카오 계정은 로그인할 수 없고, 연동하면 로그인된다', async () => {
      expect(await complete({ purpose: 'login', profileKey: 'hanbit' })).toBe(
        '/login?social=not-linked',
      );

      await login();
      expect(await complete({ purpose: 'link', profileKey: 'hanbit' })).toBe(
        '/settings?social=linked',
      );
      expect((await client.GET('/api/v1/me/social')).data).toEqual({
        hasPassword: true,
        kakao: { isLinked: true },
      });

      await client.POST('/api/v1/auth/logout');

      expect(await complete({ purpose: 'login', profileKey: 'hanbit' })).toBe('/');
      expect((await client.GET('/api/v1/me')).response.status).toBe(200);
    });

    it('이메일이 같다는 이유만으로 연결되지 않는다 (카카오 인증 이메일이 hanbit과 같아도 연동 전에는 로그인 불가)', async () => {
      expect(DEMO_ACCOUNTS[0]!.email).toBe('hanbit@example.com');
      expect(await complete({ purpose: 'login', profileKey: 'hanbit' })).toBe(
        '/login?social=not-linked',
      );
    });

    it('이미 다른 계정에 연동된 카카오 계정은 연동할 수 없다', async () => {
      await login();
      await complete({ purpose: 'link', profileKey: 'other' });
      await client.POST('/api/v1/auth/logout');
      await login(DEMO_ACCOUNTS[1]!.loginId, DEMO_ACCOUNTS[1]!.password);

      expect(await complete({ purpose: 'link', profileKey: 'other' })).toBe(
        '/settings?social=already-linked',
      );
    });

    it('취소하면 돌아갈 화면으로 이동한다', async () => {
      expect(await complete({ purpose: 'login', profileKey: null })).toBe(
        '/login?social=cancelled',
      );
      expect(await complete({ purpose: 'link', profileKey: null })).toBe(
        '/settings?social=cancelled',
      );
    });

    it('초대 가입: 인증된 이메일이 있으면 바로 가입되고 로그인 수단은 카카오 하나뿐이라 해제할 수 없다', async () => {
      expect(
        await complete({
          purpose: 'signup',
          profileKey: 'new-verified',
          token: DEMO_INVITATION.token,
          agreed: agreedAll,
        }),
      ).toBe('/');

      const me = meResponseSchema.parse((await client.GET('/api/v1/me')).data);

      expect(me).toMatchObject({ email: 'kakao-new@example.com', isEmailVerified: true });
      expect((await client.GET('/api/v1/me/social')).data).toEqual({
        hasPassword: false,
        kakao: { isLinked: true },
      });

      const unlink = await client.DELETE('/api/v1/me/social/kakao');

      expect(unlink.response.status).toBe(409);
      expect(errorResponseSchema.parse(unlink.error).error.code).toBe('LAST_LOGIN_METHOD');
    });

    it('초대 가입: 인증된 이메일이 없거나 필수 약관에 동의하지 않았거나 없는 링크면 가입되지 않는다', async () => {
      const link = `/invite/${DEMO_INVITATION.token}`;

      expect(
        await complete({
          purpose: 'signup',
          profileKey: 'new-unverified',
          token: DEMO_INVITATION.token,
          agreed: agreedAll,
        }),
      ).toBe(`${link}?social=email-required`);
      expect(
        await complete({
          purpose: 'signup',
          profileKey: 'new-verified',
          token: DEMO_INVITATION.token,
          agreed: '',
        }),
      ).toBe(`${link}?social=failed`);
      expect(
        await complete({
          purpose: 'signup',
          profileKey: 'new-verified',
          token: 'expired-invite-0001',
          agreed: agreedAll,
        }),
      ).toBe('/login?social=invitation-invalid');
      expect((await client.GET('/api/v1/me')).response.status).toBe(401);
    });

    it('비밀번호 로그인이 있으면 연동을 해제할 수 있다', async () => {
      await login();
      await complete({ purpose: 'link', profileKey: 'hanbit' });

      expect((await client.DELETE('/api/v1/me/social/kakao')).response.status).toBe(200);
      expect((await client.GET('/api/v1/me/social')).data?.kakao.isLinked).toBe(false);
    });
  });
});
