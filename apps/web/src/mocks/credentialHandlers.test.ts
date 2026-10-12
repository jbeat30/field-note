import {
  assignmentsResponseSchema,
  employeeCredentialSchema,
  employeeCredentialsResponseSchema,
  employeesResponseSchema,
  optionsResponseSchema,
  projectsResponseSchema,
  requiredCredentialsResponseSchema,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { resetMockCredentials } from './credentialHandlers';
import { DEMO_ACCOUNTS } from './data';
import { handlers } from './handlers';
import { resetMockPhotos } from './photoHandlers';
import { resetMockState } from './state';

// 목업 응답이 서버 계약(공유 스키마)을 지키는지 검사 (handlers.test.ts와 같은 방식)
Object.defineProperty(globalThis, 'location', {
  value: new URL('http://localhost/'),
  configurable: true,
});

jest.setTimeout(60_000);

const server = setupServer(...handlers);
let client: ReturnType<typeof createApiClient>;
const demo = DEMO_ACCOUNTS[0]!;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  client = createApiClient('http://localhost');
});
afterEach(() => {
  resetMockState();
  resetMockPhotos();
  resetMockCredentials();
});
afterAll(() => server.close());

const setup = async () => {
  await client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

  const employees = employeesResponseSchema.parse(
    (await client.GET('/api/v1/employees', { params: { query: {} } })).data,
  ).items;
  const projects = projectsResponseSchema.parse(
    (await client.GET('/api/v1/projects', { params: { query: {} } })).data,
  ).items;
  const options = optionsResponseSchema.parse(
    (await client.GET('/api/v1/company/options')).data,
  ).items;

  return {
    employeeId: (name: string) => employees.find((item) => item.name === name)!.id,
    projectId: (code: string) => projects.find((item) => item.code === code)!.id,
    typeId: (name: string) => options.find((item) => item.name === name)!.id,
    options,
  };
};

const credentials = async (id: string) =>
  employeeCredentialsResponseSchema.parse(
    (await client.GET('/api/v1/employees/{id}/credentials', { params: { path: { id } } })).data,
  ).items;

describe('직원 서류 목업', () => {
  it('로그인하지 않으면 거부한다', async () => {
    expect(
      (
        await client.GET('/api/v1/employees/{id}/credentials', {
          params: { path: { id: '0198d000-0000-7000-8000-000000000101' } },
        })
      ).response.status,
    ).toBe(401);
  });

  it('자격 종류 프리셋이 선택 목록에 있고 더미 서류가 만료가 빠른 순으로 보인다', async () => {
    const { employeeId, options } = await setup();

    expect(options.filter((item) => item.kind === 'CREDENTIAL_TYPE').length).toBeGreaterThan(0);

    const own = await credentials(employeeId('한용접'));

    expect(own.map((item) => [item.typeName, item.status])).toEqual([
      ['안전교육 이수증', 'EXPIRING'],
      ['용접 기능사', 'VALID'],
    ]);
    expect((await credentials(employeeId('정판금'))).map((item) => item.status)).toEqual([
      'EXPIRED',
      'VALID',
    ]);
  });

  it('등록·수정·삭제하고 입력 오류를 서버와 같은 문구로 거부한다', async () => {
    const { employeeId, typeId } = await setup();
    const id = employeeId('오전기');
    const created = await client.POST('/api/v1/employees/{id}/credentials', {
      params: { path: { id } },
      body: { typeId: typeId('건강검진'), expiresOn: '2027-01-31' },
    });

    expect(created.response.status).toBe(201);

    const credentialId = employeeCredentialSchema.parse(created.data).id;

    const reversed = await client.PATCH('/api/v1/employees/{id}/credentials/{credentialId}', {
      params: { path: { id, credentialId } },
      body: { issuedOn: '2027-02-01' },
    });

    expect(reversed.response.status).toBe(400);

    const cleared = await client.PATCH('/api/v1/employees/{id}/credentials/{credentialId}', {
      params: { path: { id, credentialId } },
      body: { expiresOn: null },
    });

    expect(employeeCredentialSchema.parse(cleared.data)).toMatchObject({
      expiresOn: null,
      status: 'VALID',
    });

    const wrong = await client.POST('/api/v1/employees/{id}/credentials', {
      params: { path: { id } },
      body: { typeId: employeeId('오전기') },
    });

    expect(wrong.response.status).toBe(400);

    expect(
      (
        await client.DELETE('/api/v1/employees/{id}/credentials/{credentialId}', {
          params: { path: { id, credentialId } },
        })
      ).response.status,
    ).toBe(200);
    expect((await credentials(id)).some((item) => item.id === credentialId)).toBe(false);
  });

  it('직원 서류 파일을 올려 연결하고 서류 API로만 열 수 있다', async () => {
    const { employeeId, typeId } = await setup();
    const id = employeeId('오전기');
    const ticket = await client.POST('/api/v1/employees/{employeeId}/files', {
      params: { path: { employeeId: id } },
      body: { name: '자격증.pdf', contentType: 'application/pdf', size: 1000 },
    });
    const fileId = ticket.data!.file.id;

    await fetch(ticket.data!.upload.url, { method: 'PUT', body: 'x' });
    await client.POST('/api/v1/files/{id}/complete', { params: { path: { id: fileId } } });

    const created = await client.POST('/api/v1/employees/{id}/credentials', {
      params: { path: { id } },
      body: { typeId: typeId('용접 기능사'), fileId },
    });
    const credential = employeeCredentialSchema.parse(created.data);

    expect(credential.file).toMatchObject({ id: fileId, status: 'READY' });

    const url = await client.GET('/api/v1/employees/{id}/credentials/{credentialId}/file-url', {
      params: { path: { id, credentialId: credential.id } },
    });

    expect(url.response.status).toBe(200);
    expect(
      (await client.GET('/api/v1/files/{id}/url', { params: { path: { id: fileId } } })).response
        .status,
    ).toBe(404);

    // 다른 직원의 서류 파일은 연결할 수 없다
    const other = await client.POST('/api/v1/employees/{id}/credentials', {
      params: { path: { id: employeeId('한용접') } },
      body: { typeId: typeId('건강검진'), fileId },
    });

    expect(other.response.status).toBe(400);
  });
});

describe('필요 자격 목업', () => {
  it('더미 필요 자격을 보여 주고 저장하며 중복은 하나로 합친다', async () => {
    const { projectId, typeId } = await setup();
    const id = projectId('2026-001');
    const saved = requiredCredentialsResponseSchema.parse(
      (await client.GET('/api/v1/projects/{id}/required-credentials', { params: { path: { id } } }))
        .data,
    );

    expect(saved.items.map((item) => item.typeName)).toEqual(['안전교육 이수증']);

    const changed = await client.PUT('/api/v1/projects/{id}/required-credentials', {
      params: { path: { id } },
      body: { typeIds: [typeId('용접 기능사'), typeId('용접 기능사')] },
    });

    expect(
      requiredCredentialsResponseSchema.parse(changed.data).items.map((item) => item.typeName),
    ).toEqual(['용접 기능사']);
  });

  it('필요 자격이 없거나 만료된 직원을 투입하면 경고하고 서류를 갖추면 사라진다', async () => {
    const { employeeId, projectId, typeId } = await setup();
    const id = projectId('2026-001');
    const worker = employeeId('김일용');
    const weld = typeId('용접 기능사');

    await client.PUT('/api/v1/projects/{id}/required-credentials', {
      params: { path: { id } },
      body: { typeIds: [weld] },
    });

    const created = await client.POST('/api/v1/projects/{id}/assignments', {
      params: { path: { id } },
      body: { employeeId: worker, startDate: '2026-10-20', endDate: '2026-10-30' },
    });

    expect(created.response.status).toBe(201);
    expect(created.data!.warnings).toEqual([
      {
        type: 'CREDENTIAL',
        typeId: weld,
        typeName: '용접 기능사',
        reason: 'MISSING',
        expiresOn: null,
      },
    ]);

    await client.POST('/api/v1/employees/{id}/credentials', {
      params: { path: { id: worker } },
      body: { typeId: weld, expiresOn: '2030-01-01' },
    });

    const list = assignmentsResponseSchema.parse(
      (
        await client.GET('/api/v1/projects/{id}/assignments', {
          params: { path: { id }, query: {} },
        })
      ).data,
    ).items;

    expect(list.find((item) => item.employeeId === worker)!.warnings).toEqual([]);
  });

  it('자격 종류가 아닌 항목은 거부한다', async () => {
    const { employeeId, projectId } = await setup();
    const res = await client.PUT('/api/v1/projects/{id}/required-credentials', {
      params: { path: { id: projectId('2026-001') } },
      body: { typeIds: [employeeId('오전기')] },
    });

    expect(res.response.status).toBe(400);
  });
});
