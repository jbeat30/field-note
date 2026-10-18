import { fetchWithRetry, setUnauthorizedHandler, writeRequestMiddleware } from './client';

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

describe('멱등 키 재사용', () => {
  let counter = 0;
  const send = async (body: string, path = `/api/v1/retry-${(counter += 1)}`) => {
    const request = new Request(`http://localhost${path}`, { method: 'POST', body });
    const onRequest = writeRequestMiddleware.onRequest!;
    const sent = (await onRequest({ request } as Parameters<typeof onRequest>[0])) as Request;
    const respond = async (status: number) => {
      const onResponse = writeRequestMiddleware.onResponse!;

      await onResponse({
        request: sent,
        response: new Response(null, { status }),
      } as Parameters<typeof onResponse>[0]);
    };

    return { key: sent.headers.get('Idempotency-Key'), respond, path };
  };

  it('아직 끝나지 않은 같은 요청(더블 클릭)은 같은 키를 쓴다', async () => {
    const first = await send('{"a":1}');
    const second = await send('{"a":1}', first.path);

    expect(second.key).toBe(first.key);
  });

  it('서버 오류나 요청 과다로 실패한 뒤 다시 보내면 같은 키를 쓴다', async () => {
    for (const status of [500, 503, 429]) {
      const first = await send('{"a":1}');

      await first.respond(status);

      expect((await send('{"a":1}', first.path)).key).toBe(first.key);
    }
  });

  it('성공하거나 입력 오류로 끝나면 다음 요청은 새 키를 쓴다', async () => {
    for (const status of [201, 200, 400, 409, 422]) {
      const first = await send('{"a":1}');

      await first.respond(status);

      expect((await send('{"a":1}', first.path)).key).not.toBe(first.key);
    }
  });

  it('내용이나 주소가 다르면 다른 키를 쓴다', async () => {
    const first = await send('{"a":1}');
    const otherBody = await send('{"a":2}', first.path);
    const otherPath = await send('{"a":1}');

    expect(otherBody.key).not.toBe(first.key);
    expect(otherPath.key).not.toBe(first.key);
  });
});

describe('세션 만료 알림', () => {
  const respondWith = async (status: number, code?: string) => {
    const onResponse = writeRequestMiddleware.onResponse!;

    await onResponse({
      request: new Request('http://localhost/api/v1/projects'),
      response: new Response(code ? JSON.stringify({ error: { code } }) : null, { status }),
    } as Parameters<typeof onResponse>[0]);
  };

  afterEach(() => setUnauthorizedHandler(null));

  it('로그인이 필요하다는 401(UNAUTHORIZED)일 때만 알린다', async () => {
    const handler = jest.fn();

    setUnauthorizedHandler(handler);
    await respondWith(401, 'INVALID_CREDENTIALS');
    await respondWith(403, 'EMAIL_NOT_VERIFIED');
    await respondWith(401);
    expect(handler).not.toHaveBeenCalled();

    await respondWith(401, 'UNAUTHORIZED');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('fetchWithRetry', () => {
  const originalFetch = globalThis.fetch;
  const get = () => new Request('http://localhost/api/v1/projects');

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
  });

  const run = async (request: Request) => {
    jest.useFakeTimers();

    const result = fetchWithRetry(request);

    await jest.runAllTimersAsync();

    return result;
  };

  it('연결이 끊기거나 게이트웨이 오류면 두 번까지 다시 시도해 성공을 돌려준다', async () => {
    const mock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    globalThis.fetch = mock;

    expect((await run(get())).status).toBe(200);
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it('계속 실패하면 세 번째 결과를 그대로 돌려준다', async () => {
    const mock = jest.fn().mockResolvedValue(new Response(null, { status: 502 }));

    globalThis.fetch = mock;

    expect((await run(get())).status).toBe(502);
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it('입력·권한 오류, 요청 과다, 서버 내부 오류는 다시 시도하지 않는다', async () => {
    for (const status of [400, 401, 403, 404, 429, 500]) {
      const mock = jest.fn().mockResolvedValue(new Response(null, { status }));

      globalThis.fetch = mock;

      expect((await run(get())).status).toBe(status);
      expect(mock).toHaveBeenCalledTimes(1);
    }
  });

  it('쓰기 요청은 자동으로 다시 보내지 않는다', async () => {
    const mock = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    globalThis.fetch = mock;

    const request = new Request('http://localhost/api/v1/projects', { method: 'POST', body: '{}' });
    const result = fetchWithRetry(request);

    await expect(result).rejects.toThrow('Failed to fetch');
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
