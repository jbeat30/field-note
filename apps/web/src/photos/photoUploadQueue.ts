import { useSyncExternalStore } from 'react';

import { queryClient } from '../query/queryClient';

import { createUploadApi } from './uploadApi';
import { createUploadQueue, type UploadQueue } from './uploadQueue';
import { createIndexedDbUploadStore } from './uploadStore';

let instance: UploadQueue | null = null;

/**
 * @description 앱 전체가 함께 쓰는 사진 업로드 대기열 (처음 쓸 때 만들고, 저장해 둔 항목을 이어서 올림).
 * 화면을 옮겨 다녀도 올리던 작업이 끊기지 않도록 화면이 아니라 모듈에 둔다
 * @returns 업로드 대기열
 */
export const getPhotoUploadQueue = (): UploadQueue => {
  if (!instance) {
    instance = createUploadQueue({
      api: createUploadApi(),
      store: createIndexedDbUploadStore(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      isOnline: () => navigator.onLine,
      onOnline: (listener) => {
        window.addEventListener('online', listener);

        return () => window.removeEventListener('online', listener);
      },
      now: () => new Date(),
      newId: () => crypto.randomUUID(),
      // 한 장이 등록되면 사진첩을 새로 읽음
      onItemDone: () => void queryClient.invalidateQueries({ queryKey: ['photos'] }),
    });
    void instance.resume();
  }

  return instance;
};

export const usePhotoUploadItems = () => {
  const queue = getPhotoUploadQueue();

  return useSyncExternalStore(queue.subscribe, queue.getItems);
};
