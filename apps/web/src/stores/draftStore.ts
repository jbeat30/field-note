import { createStore, del, get, set } from 'idb-keyval';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

// 작성 중 일지·메모 초안 (앱을 닫거나 연결이 끊겨도 IndexedDB에 남음)
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
    { name: DRAFT_STORAGE_NAME, storage: createJSONStorage(() => indexedDbStorage) },
  ),
);

/**
 * @description 메모리 상태와 IndexedDB 저장분을 모두 비움
 */
export const resetDraftStore = async () => {
  useDraftStore.setState({ drafts: {} });
  await useDraftStore.persist.clearStorage();
};
