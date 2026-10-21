import { createStore, del, get, set } from 'idb-keyval';
import { create } from 'zustand';

import { pruneDrafts } from '../drafts/formDraft';
import { pruneStagedDrafts } from '../staging/stagedFiles';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

// 작성 중 작업 내역·메모 초안 (앱을 닫거나 연결이 끊겨도 IndexedDB에 남음)
type DraftState = {
  drafts: Record<string, string>;
  setDraft: (key: string, value: string) => void;
  removeDraft: (key: string) => void;
};

export const DRAFT_STORAGE_NAME = 'field-note-drafts';

const lazyStore = () => createStore('field-note', 'drafts');

export const indexedDbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name, lazyStore())) ?? null,
  setItem: (name, value) => set(name, value, lazyStore()),
  removeItem: (name) => del(name, lazyStore()),
};

export const useDraftStore = create<DraftState>()(
  persist(
    (setState) => ({
      drafts: {},
      setDraft: (key, value) =>
        setState((state) => ({ drafts: { ...state.drafts, [key]: value } })),
      removeDraft: (key) =>
        setState((state) => ({
          drafts: Object.fromEntries(
            Object.entries(state.drafts).filter(([draftKey]) => draftKey !== key),
          ),
        })),
    }),
    {
      name: DRAFT_STORAGE_NAME,
      storage: createJSONStorage(() => indexedDbStorage),
      // 읽어 온 뒤 오래된 작업 내역·자재 초안과 보관 시간이 지난 임시 파일 기록을 정리 (기기에 영원히 남지 않게)
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const now = new Date();
        const pruned = pruneStagedDrafts(pruneDrafts(state.drafts, now), now);

        if (pruned !== state.drafts) useDraftStore.setState({ drafts: pruned });
      },
    },
  ),
);

/**
 * @description 메모리 상태와 IndexedDB 저장분을 모두 비움
 */
export const resetDraftStore = async () => {
  useDraftStore.setState({ drafts: {} });
  await useDraftStore.persist.clearStorage();
};
