import { createStore, del, get, set, values } from 'idb-keyval';

import type { UploadItem, UploadStore } from './uploadQueue';

// 대기열 항목과 사진 내용은 앱을 닫아도 남도록 IndexedDB에 둔다 (초안 저장소와 같은 데이터베이스, 별도 저장소)
const itemStore = () => createStore('field-note-photo-queue', 'items');
const blobStore = () => createStore('field-note-photo-queue-blobs', 'blobs');

export const createIndexedDbUploadStore = (): UploadStore => ({
  loadAll: async () => {
    const all = await values<UploadItem>(itemStore());

    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  save: (item) => set(item.id, item, itemStore()),
  remove: (id) => del(id, itemStore()),
  putBlob: (id, blob) => set(id, blob, blobStore()),
  getBlob: (id) => get<Blob>(id, blobStore()),
  removeBlob: (id) => del(id, blobStore()),
});
