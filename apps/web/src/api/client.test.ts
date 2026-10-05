import { writeRequestMiddleware } from './client';

const applyAll = async (method: string, headers?: Record<string, string>) => {
  const request = new Request('http://localhost/api/v1/samples', { method, headers });
  const onRequest = writeRequestMiddleware.onRequest!;
  const result = (await onRequest({ request } as Parameters<typeof onRequest>[0])) as Request;

  return result.headers;
};

const apply = async (method: string, headers?: Record<string, string>) =>
  (await applyAll(method, headers)).get('Idempotency-Key');

describe('writeRequestMiddleware', () => {
  it('쓰기 요청에 멱등 키를 붙인다', async () => {
    expect(await apply('POST')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('조회 요청에는 붙이지 않는다', async () => {
    expect(await apply('GET')).toBeNull();
  });

  it('호출부가 지정한 키는 유지한다 (재시도 시 같은 키 사용)', async () => {
    expect(await apply('POST', { 'Idempotency-Key': 'retry-key-0001' })).toBe('retry-key-0001');
  });

  it('쓰기 요청에 CSRF 헤더를 붙이고 조회 요청에는 붙이지 않는다', async () => {
    expect((await applyAll('POST')).get('X-Field-Note-Client')).toBe('web');
    expect((await applyAll('GET')).get('X-Field-Note-Client')).toBeNull();
  });
});
