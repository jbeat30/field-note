import { createQueryClient } from '../query/queryClient';
import { queryKeys } from '../query/queryKeys';

import { useDraftStore } from './draftStore';
import { resetClientState } from './resetClientState';
import { useUiStore } from './uiStore';

// IndexedDB 대신 메모리 맵 사용
const mockDb = new Map<string, unknown>();

jest.mock('idb-keyval', () => ({
  createStore: () => 'store',
  get: async (key: string) => mockDb.get(key),
  set: async (key: string, value: unknown) => {
    mockDb.set(key, value);
  },
  del: async (key: string) => {
    mockDb.delete(key);
  },
}));

describe('resetClientState', () => {
  it('로그아웃 시 쿼리 캐시, 화면 상태, 저장된 초안을 모두 비운다', async () => {
    const queryClient = createQueryClient();

    queryClient.setQueryData(queryKeys.session(), { companyId: '회사 A' });
    useUiStore.getState().setQuickAddOpen(true);
    useDraftStore.getState().setDraft('log-1', '작성 중인 일지');
    await Promise.resolve();

    expect(mockDb.size).toBe(1);

    await resetClientState(queryClient);

    expect(queryClient.getQueryData(queryKeys.session())).toBeUndefined();
    expect(useUiStore.getState().isQuickAddOpen).toBe(false);
    expect(useDraftStore.getState().drafts).toEqual({});
    expect(mockDb.size).toBe(0);
  });
});
