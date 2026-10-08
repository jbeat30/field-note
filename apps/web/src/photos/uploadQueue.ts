import type { PhotoCategory } from '@field-note/shared';

// 사진 업로드 대기열: 선택 즉시 목록에 보이고, 백그라운드에서 한 장씩 순서대로 올리며,
// 실패하면 다시 시도하고, 앱을 닫아도 IndexedDB에 남아 다시 열면 이어서 올린다 (기술 기획서 §6)
//
// 한 장의 진행 단계: REQUEST(업로드 신청) → PUT(저장소에 올리기) → COMPLETE(완료 알림) → REGISTER(사진으로 등록)
// 각 단계는 다시 보내도 안전해서(서버가 중복을 막음) 어느 단계에서 끊겨도 그 단계부터 이어간다
export const UPLOAD_STEPS = ['REQUEST', 'PUT', 'COMPLETE', 'REGISTER'] as const;

export type UploadStep = (typeof UPLOAD_STEPS)[number];

export type UploadStatus =
  // 차례를 기다리는 중
  | 'QUEUED'
  // 올리는 중
  | 'RUNNING'
  // 연결이 없거나 일시 오류라 잠시 뒤 다시 시도
  | 'WAITING'
  // 다시 시도해도 안 되어 멈춤 (사용자가 다시 시도하거나 취소)
  | 'FAILED'
  | 'DONE';

export type UploadMeta = {
  category: PhotoCategory;
  area?: string;
  description?: string;
  // 촬영일시(ISO). 비우면 서버가 등록 시각으로 정함
  takenAt?: string;
};

export type UploadTicket = {
  url: string;
  headers: Record<string, string>;
  expiresAt: string;
};

export type UploadItem = {
  id: string;
  projectId: string;
  name: string;
  size: number;
  meta: UploadMeta;
  step: UploadStep;
  status: UploadStatus;
  // 연속 실패 횟수 (단계가 넘어가면 0으로 돌아감)
  attempts: number;
  fileId?: string;
  ticket?: UploadTicket;
  error?: string;
  createdAt: string;
};

export const MAX_ATTEMPTS = 6;

// 재시도 간격: 2초부터 두 배씩, 최대 60초 (느린 회선에서 서버를 몰아붙이지 않음)
export const retryDelayMs = (attempts: number) => Math.min(60_000, 2000 * 2 ** (attempts - 1));

// 단계 실행 결과: 성공(다음 단계로), 일시 오류(다시 시도), 영구 오류(멈춤), 신청부터 다시(업로드 주소 만료 등)
export class StepError extends Error {
  constructor(
    readonly kind: 'TRANSIENT' | 'PERMANENT' | 'RESTART',
    message: string,
  ) {
    super(message);
  }
}

export type UploadApi = {
  requestUpload: (
    projectId: string,
    file: { name: string; size: number },
  ) => Promise<{ fileId: string; ticket: UploadTicket }>;
  put: (ticket: UploadTicket, blob: Blob) => Promise<void>;
  complete: (fileId: string) => Promise<void>;
  register: (projectId: string, fileId: string, meta: UploadMeta) => Promise<void>;
};

export type UploadStore = {
  loadAll: () => Promise<UploadItem[]>;
  save: (item: UploadItem) => Promise<void>;
  remove: (id: string) => Promise<void>;
  putBlob: (id: string, blob: Blob) => Promise<void>;
  getBlob: (id: string) => Promise<Blob | undefined>;
  removeBlob: (id: string) => Promise<void>;
};

export type UploadQueueDeps = {
  api: UploadApi;
  store: UploadStore;
  sleep: (ms: number) => Promise<void>;
  isOnline: () => boolean;
  // 연결이 돌아오면 호출되는 알림을 등록 (해제 함수 반환)
  onOnline: (listener: () => void) => () => void;
  now: () => Date;
  newId: () => string;
  // 사진 한 장이 등록까지 끝났을 때 (사진첩 새로 고침용)
  onItemDone?: (item: UploadItem) => void;
};

export type UploadQueue = {
  getItems: () => readonly UploadItem[];
  subscribe: (listener: () => void) => () => void;
  // 저장해 둔 대기열을 불러와 이어서 올림 (앱 시작 때 한 번)
  resume: () => Promise<void>;
  enqueue: (projectId: string, blob: Blob, name: string, meta: UploadMeta) => Promise<string>;
  retry: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  // 끝난 항목을 목록에서 치움
  clearDone: () => void;
  // 지금 처리 중인 작업이 끝나길 기다림 (테스트용)
  idle: () => Promise<void>;
};

const nextStep = (step: UploadStep): UploadStep | null =>
  UPLOAD_STEPS[UPLOAD_STEPS.indexOf(step) + 1] ?? null;

/**
 * @description 업로드 대기열 생성. 한 번에 한 장씩 순서대로 처리하고 단계마다 저장해 둔다
 * @param deps 서버 호출, 저장소, 시간 등 외부 의존성 (테스트에서 교체)
 * @returns 업로드 대기열
 */
export const createUploadQueue = (deps: UploadQueueDeps): UploadQueue => {
  let items: UploadItem[] = [];
  const listeners = new Set<() => void>();
  let running: Promise<void> | null = null;

  const emit = () => listeners.forEach((listener) => listener());

  // 변경은 새 배열로 바꿔 구독자가 변경을 알아채게 함
  const update = async (id: string, patch: Partial<UploadItem>) => {
    let changed: UploadItem | undefined;

    items = items.map((item) => {
      if (item.id !== id) return item;

      changed = { ...item, ...patch };

      return changed;
    });
    emit();

    if (changed && changed.status !== 'DONE') {
      await deps.store.save(changed);
    }
  };

  const find = (id: string) => items.find((item) => item.id === id);

  const execute = async (item: UploadItem): Promise<UploadItem> => {
    switch (item.step) {
      case 'REQUEST': {
        const { fileId, ticket } = await deps.api.requestUpload(item.projectId, {
          name: item.name,
          size: item.size,
        });

        return { ...item, fileId, ticket };
      }
      case 'PUT': {
        const blob = await deps.store.getBlob(item.id);

        if (!blob) {
          throw new StepError('PERMANENT', '저장해 둔 사진을 찾을 수 없습니다');
        }

        // 업로드 주소가 이미 만료됐으면 보내지 않고 새로 신청
        if (!item.ticket || new Date(item.ticket.expiresAt) <= deps.now()) {
          throw new StepError('RESTART', '업로드 주소가 만료되었습니다');
        }

        await deps.api.put(item.ticket, blob);

        return item;
      }
      case 'COMPLETE':
        await deps.api.complete(item.fileId!);

        return item;
      case 'REGISTER':
        await deps.api.register(item.projectId, item.fileId!, item.meta);

        return item;
    }
  };

  // 한 장을 끝까지(또는 멈출 때까지) 처리
  const process = async (id: string) => {
    for (;;) {
      const item = find(id);

      if (!item || item.status === 'FAILED' || item.status === 'DONE') return;

      if (!deps.isOnline()) {
        await update(id, { status: 'WAITING' });
        await new Promise<void>((resolve) => {
          const off = deps.onOnline(() => {
            off();
            resolve();
          });

          // 대기 중에 이미 연결이 돌아온 경우를 놓치지 않음
          if (deps.isOnline()) {
            off();
            resolve();
          }
        });
        continue;
      }

      await update(id, { status: 'RUNNING' });

      try {
        const done = await execute(item);
        const step = nextStep(item.step);

        if (step) {
          await update(id, {
            step,
            status: 'QUEUED',
            attempts: 0,
            error: undefined,
            fileId: done.fileId,
            ticket: done.ticket,
          });
          continue;
        }

        const finished = { ...find(id)!, status: 'DONE' as const };

        await update(id, { status: 'DONE' });
        await deps.store.remove(id);
        await deps.store.removeBlob(id);
        deps.onItemDone?.(finished);

        return;
      } catch (error) {
        const kind = error instanceof StepError ? error.kind : 'TRANSIENT';
        const message = error instanceof Error ? error.message : '알 수 없는 오류';
        const attempts = item.attempts + 1;

        if (kind === 'PERMANENT' || attempts >= MAX_ATTEMPTS) {
          await update(id, { status: 'FAILED', attempts, error: message });

          return;
        }

        // 주소 만료는 신청부터 다시 (새 업로드 주소를 받음)
        await update(id, {
          status: 'WAITING',
          attempts,
          error: message,
          ...(kind === 'RESTART' ? { step: 'REQUEST', ticket: undefined, fileId: undefined } : {}),
        });
        await deps.sleep(retryDelayMs(attempts));
      }
    }
  };

  const hasPending = () =>
    items.some((item) => item.status === 'QUEUED' || item.status === 'WAITING');

  // 차례대로 한 장씩 처리하는 반복 (이미 돌고 있으면 새로 시작하지 않음)
  // 반복이 바로 끝나는 경우(처리할 항목이 없음)에도 running이 남지 않도록 정리는 finally 콜백(비동기)에서 한다
  const kick = () => {
    if (running) return;

    running = (async () => {
      while (hasPending()) {
        await process(
          items.find((item) => item.status === 'QUEUED' || item.status === 'WAITING')!.id,
        );
      }
    })().finally(() => {
      running = null;
      // 처리 중에 새로 들어온 항목이 있으면 이어서
      if (hasPending()) kick();
    });
  };

  return {
    getItems: () => items,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    resume: async () => {
      const saved = await deps.store.loadAll();

      // 앱이 닫히던 순간 올리던 항목도 대기 상태로 되돌려 이어서 처리
      items = [
        ...items,
        ...saved
          .filter((item) => !find(item.id))
          .map((item) => ({
            ...item,
            status: item.status === 'FAILED' ? ('FAILED' as const) : ('QUEUED' as const),
          })),
      ];
      emit();
      kick();
    },
    enqueue: async (projectId, blob, name, meta) => {
      const item: UploadItem = {
        id: deps.newId(),
        projectId,
        name,
        size: blob.size,
        meta,
        step: 'REQUEST',
        status: 'QUEUED',
        attempts: 0,
        createdAt: deps.now().toISOString(),
      };

      // 사진 내용을 먼저 저장해 둬야 앱을 닫아도 이어 올릴 수 있음
      await deps.store.putBlob(item.id, blob);
      await deps.store.save(item);
      items = [...items, item];
      emit();
      kick();

      return item.id;
    },
    retry: async (id) => {
      const item = find(id);

      if (!item || item.status !== 'FAILED') return;

      await update(id, { status: 'QUEUED', attempts: 0, error: undefined });
      kick();
    },
    cancel: async (id) => {
      items = items.filter((item) => item.id !== id);
      emit();
      await deps.store.remove(id);
      await deps.store.removeBlob(id);
    },
    clearDone: () => {
      items = items.filter((item) => item.status !== 'DONE');
      emit();
    },
    idle: async () => {
      while (running) {
        await running;
      }
    },
  };
};
