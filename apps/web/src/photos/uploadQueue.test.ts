import {
  createUploadQueue,
  MAX_ATTEMPTS,
  retryDelayMs,
  StepError,
  type UploadApi,
  type UploadItem,
  type UploadStore,
} from './uploadQueue';

const NOW = new Date('2026-10-08T03:00:00Z');
const FUTURE = '2026-10-08T03:15:00.000Z';
const TICKET = {
  url: 'http://storage.test/up',
  headers: { 'Content-Type': 'image/jpeg' },
  expiresAt: FUTURE,
};

const memoryStore = (initial: UploadItem[] = []) => {
  const items = new Map(initial.map((item) => [item.id, item]));
  const blobs = new Map<string, Blob>(initial.map((item) => [item.id, new Blob(['x'])]));
  const store: UploadStore = {
    loadAll: async () => [...items.values()],
    save: async (item) => void items.set(item.id, item),
    remove: async (id) => void items.delete(id),
    putBlob: async (id, blob) => void blobs.set(id, blob),
    getBlob: async (id) => blobs.get(id),
    removeBlob: async (id) => void blobs.delete(id),
  };

  return { store, items, blobs };
};

const setup = (overrides: Partial<UploadApi> = {}, initial: UploadItem[] = []) => {
  const calls: string[] = [];
  let fileSeq = 0;
  const api: UploadApi = {
    requestUpload: async (_projectId, file) => {
      fileSeq += 1;
      calls.push(`request:${file.name}`);

      return { fileId: `file-${fileSeq}`, ticket: TICKET };
    },
    put: async () => void calls.push('put'),
    complete: async (fileId) => void calls.push(`complete:${fileId}`),
    register: async (_projectId, fileId) => void calls.push(`register:${fileId}`),
    ...overrides,
  };
  const memory = memoryStore(initial);
  const sleeps: number[] = [];
  const online = { value: true, listeners: new Set<() => void>() };
  const done: UploadItem[] = [];
  let idSeq = 0;
  const queue = createUploadQueue({
    api,
    store: memory.store,
    sleep: async (ms) => void sleeps.push(ms),
    isOnline: () => online.value,
    onOnline: (listener) => {
      online.listeners.add(listener);

      return () => online.listeners.delete(listener);
    },
    now: () => NOW,
    newId: () => `item-${(idSeq += 1)}`,
    onItemDone: (item) => void done.push(item),
  });

  return { queue, calls, sleeps, online, done, ...memory };
};

const meta = { category: 'BEFORE' as const };
const blob = new Blob(['photo']);

describe('업로드 대기열', () => {
  it('신청 → 올리기 → 완료 알림 → 사진 등록 순서로 처리하고 끝나면 저장분을 지운다', async () => {
    const s = setup();

    await s.queue.enqueue('p1', blob, 'a.jpg', meta);
    await s.queue.idle();

    expect(s.calls).toEqual(['request:a.jpg', 'put', 'complete:file-1', 'register:file-1']);
    expect(s.queue.getItems().map((item) => item.status)).toEqual(['DONE']);
    expect(s.items.size).toBe(0);
    expect(s.blobs.size).toBe(0);
    expect(s.done).toHaveLength(1);
  });

  it('선택하자마자 목록에 보이고 한 장씩 순서대로 올린다', async () => {
    const s = setup();

    await s.queue.enqueue('p1', blob, 'a.jpg', meta);
    await s.queue.enqueue('p1', blob, 'b.jpg', meta);

    expect(s.queue.getItems().map((item) => item.name)).toEqual(['a.jpg', 'b.jpg']);

    await s.queue.idle();

    expect(s.calls.filter((call) => call.startsWith('request'))).toEqual([
      'request:a.jpg',
      'request:b.jpg',
    ]);
    expect(s.calls.indexOf('register:file-1')).toBeLessThan(s.calls.indexOf('request:b.jpg'));
  });

  it('일시 오류는 간격을 늘려 가며 다시 시도하고 해당 단계부터 이어간다', async () => {
    let failures = 2;
    const s = setup({
      put: async () => {
        if (failures > 0) {
          failures -= 1;
          throw new StepError('TRANSIENT', '연결이 끊겼습니다');
        }
      },
    });

    await s.queue.enqueue('p1', blob, 'a.jpg', meta);
    await s.queue.idle();

    expect(s.sleeps).toEqual([2000, 4000]);
    // 신청은 한 번만 (이미 받은 업로드 주소로 다시 올림)
    expect(s.calls.filter((call) => call.startsWith('request'))).toHaveLength(1);
    expect(s.queue.getItems()[0]).toMatchObject({ status: 'DONE', attempts: 0 });
  });

  it('재시도 간격은 최대 60초다', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(retryDelayMs)).toEqual([
      2000, 4000, 8000, 16000, 32000, 60000, 60000,
    ]);
  });

  it('계속 실패하면 멈추고 사용자가 다시 시도하면 처음 단계부터 이어서 처리한다', async () => {
    let broken = true;
    const s = setup({
      complete: async () => {
        if (broken) throw new StepError('TRANSIENT', '서버가 응답하지 않습니다');
      },
    });

    await s.queue.enqueue('p1', blob, 'a.jpg', meta);
    await s.queue.idle();

    const failed = s.queue.getItems()[0]!;

    expect(failed).toMatchObject({ status: 'FAILED', step: 'COMPLETE', attempts: MAX_ATTEMPTS });
    expect(failed.error).toBe('서버가 응답하지 않습니다');
    // 멈춘 항목은 저장소에 남아 앱을 다시 열어도 사라지지 않음
    expect(s.items.get(failed.id)?.status).toBe('FAILED');

    broken = false;
    await s.queue.retry(failed.id);
    await s.queue.idle();

    expect(s.queue.getItems()[0]!.status).toBe('DONE');
    expect(s.calls.filter((call) => call.startsWith('request'))).toHaveLength(1);
  });

  it('고칠 수 없는 오류(용량 초과 등)는 바로 멈추고 사유를 보여 준다', async () => {
    const s = setup({
      requestUpload: async () => {
        throw new StepError('PERMANENT', '저장 용량 한도를 넘었습니다');
      },
    });

    await s.queue.enqueue('p1', blob, 'a.jpg', meta);
    await s.queue.idle();

    expect(s.queue.getItems()[0]).toMatchObject({
      status: 'FAILED',
      attempts: 1,
      error: '저장 용량 한도를 넘었습니다',
    });
    expect(s.sleeps).toEqual([]);
  });

  it('업로드 주소가 만료됐으면 보내지 않고 새로 신청한다', async () => {
    const expired = {
      ...TICKET,
      expiresAt: '2026-10-08T02:00:00.000Z',
    };
    const s = setup({}, [
      {
        id: 'old',
        projectId: 'p1',
        name: 'a.jpg',
        size: 1,
        meta,
        step: 'PUT',
        status: 'QUEUED',
        attempts: 0,
        fileId: 'stale-file',
        ticket: expired,
        createdAt: NOW.toISOString(),
      },
    ]);

    await s.queue.resume();
    await s.queue.idle();

    expect(s.calls).toEqual(['request:a.jpg', 'put', 'complete:file-1', 'register:file-1']);
  });

  it('연결이 없으면 서버를 부르지 않고 기다리다 연결이 돌아오면 이어서 올린다', async () => {
    const s = setup();

    s.online.value = false;
    await s.queue.enqueue('p1', blob, 'a.jpg', meta);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(s.calls).toEqual([]);
    expect(s.queue.getItems()[0]!.status).toBe('WAITING');

    s.online.value = true;
    s.online.listeners.forEach((listener) => listener());
    await s.queue.idle();

    expect(s.queue.getItems()[0]!.status).toBe('DONE');
  });

  it('앱을 다시 열면 저장해 둔 항목을 끊긴 단계부터 이어서 올린다', async () => {
    const saved: UploadItem = {
      id: 'saved',
      projectId: 'p1',
      name: 'a.jpg',
      size: 1,
      meta,
      step: 'COMPLETE',
      // 닫히던 순간 올리던 중이었음
      status: 'RUNNING',
      attempts: 0,
      fileId: 'file-9',
      ticket: TICKET,
      createdAt: NOW.toISOString(),
    };
    const failed: UploadItem = { ...saved, id: 'failed', status: 'FAILED', error: '이전 오류' };
    const s = setup({}, [saved, failed]);

    await s.queue.resume();
    await s.queue.idle();

    expect(s.calls).toEqual(['complete:file-9', 'register:file-9']);
    // 멈춘 항목은 자동으로 다시 시도하지 않고 사용자가 정함
    expect(s.queue.getItems().find((item) => item.id === 'failed')?.status).toBe('FAILED');
  });

  it('저장해 둔 항목이 없을 때 시작해도 이후에 추가한 사진을 올린다', async () => {
    const s = setup();

    await s.queue.resume();
    await s.queue.enqueue('p1', blob, 'a.jpg', meta);
    await s.queue.idle();

    expect(s.queue.getItems()[0]!.status).toBe('DONE');
  });

  it('취소하면 목록과 저장분에서 모두 지운다', async () => {
    const s = setup();

    s.online.value = false;

    const id = await s.queue.enqueue('p1', blob, 'a.jpg', meta);

    await s.queue.cancel(id);

    expect(s.queue.getItems()).toEqual([]);
    expect(s.items.size).toBe(0);
    expect(s.blobs.size).toBe(0);

    s.online.value = true;
    s.online.listeners.forEach((listener) => listener());
    await s.queue.idle();

    expect(s.calls).toEqual([]);
  });

  it('구독자에게 변경을 알린다', async () => {
    const s = setup();
    const seen: string[] = [];

    s.queue.subscribe(() =>
      seen.push(
        s.queue
          .getItems()
          .map((item) => item.status)
          .join(),
      ),
    );
    await s.queue.enqueue('p1', blob, 'a.jpg', meta);
    await s.queue.idle();

    expect(seen[0]).toBe('QUEUED');
    expect(seen[seen.length - 1]).toBe('DONE');
  });
});
