import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useDraftStore } from '../stores/draftStore';

import { parseDraft, serializeDraft } from './formDraft';

/**
 * @description 초안 저장소(IndexedDB)를 읽어 오는 일이 끝났는지. 끝나기 전에 폼을 그리면 저장된 초안을 놓치므로 화면이 이 값을 기다린다
 * @returns 읽기가 끝났으면 true
 */
export const useDraftHydrated = () =>
  useSyncExternalStore(
    (listener) => useDraftStore.persist.onFinishHydration(listener),
    () => useDraftStore.persist.hasHydrated(),
  );

export type DraftStatus =
  // 저장된 초안이 없음
  | 'none'
  // 이 폼을 쓰기 시작했을 때와 서버 내용이 같아 그대로 복구함
  | 'restored'
  // 그사이 서버 내용이 바뀌어(다른 기기 등) 자동으로 덮지 않음. 사용자가 불러올지 정함
  | 'stale';

type Options<T> = {
  key: string;
  // 지금 서버에 있는 일지의 버전 (없으면 null)
  baseVersion: number | null;
  // 서버 내용만으로 만든 처음 값의 비교용 글자. 같으면 초안을 만들지 않고 이미 있던 초안도 지움
  initialSignature: string;
  // 폼 값을 비교용 글자로 바꾸는 함수 (화면에서만 쓰는 임의 키를 빼고 비교)
  signatureOf: (value: T) => string;
  debounceMs?: number;
};

/**
 * @description 폼 입력을 기기에 자동 임시 저장하고 다시 열면 복구. 쓰는 동안 잠깐 멈추면(기본 0.6초) 저장하고, 화면을 숨기거나 닫을 때는 바로 저장한다.
 * 서버에 저장하면 `clear`로 초안을 지운다
 * @param options 저장 키, 서버 버전, 비교 기준
 * @returns 저장된 초안 상태·값, 저장·삭제 함수
 */
export const useLocalDraft = <T>({
  key,
  baseVersion,
  initialSignature,
  signatureOf,
  debounceMs = 600,
}: Options<T>) => {
  // 마운트 때 한 번만 읽음 (초안 저장소 읽기가 끝난 뒤에 폼을 그려야 정확함)
  const [stored, setStored] = useState(() => parseDraft<T>(useDraftStore.getState().drafts[key]));
  const status: DraftStatus = !stored
    ? 'none'
    : stored.baseVersion === baseVersion
      ? 'restored'
      : 'stale';
  const pending = useRef<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ key, baseVersion, initialSignature, signatureOf });

  // 타이머·화면 숨김 같은 나중 호출이 항상 최신 값을 쓰도록 렌더 뒤에 갱신 (렌더 중에 ref를 바꾸지 않음)
  useEffect(() => {
    latest.current = { key, baseVersion, initialSignature, signatureOf };
  });

  const commit = (value: T) => {
    const current = latest.current;
    const { setDraft, removeDraft } = useDraftStore.getState();

    // 서버 내용과 같으면 초안이 필요 없음
    if (current.signatureOf(value) === current.initialSignature) {
      removeDraft(current.key);

      return;
    }

    setDraft(
      current.key,
      serializeDraft({
        value,
        baseVersion: current.baseVersion,
        savedAt: new Date().toISOString(),
      }),
    );
  };

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);

    timer.current = null;

    if (pending.current !== null) {
      commit(pending.current);
      pending.current = null;
    }
  };

  // 화면을 숨기거나(앱 전환·종료) 닫을 때 기다리던 저장을 바로 함
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);

    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
    // flush는 ref만 읽으므로 한 번만 등록
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    // 복구하거나 불러올 때 쓰는 저장된 값
    value: stored?.value,
    savedAt: stored?.savedAt,
    write: (value: T) => {
      pending.current = value;

      if (timer.current) clearTimeout(timer.current);

      timer.current = setTimeout(flush, debounceMs);
    },
    // 서버에 저장했거나 사용자가 버리기로 했을 때
    clear: () => {
      if (timer.current) clearTimeout(timer.current);

      timer.current = null;
      pending.current = null;
      useDraftStore.getState().removeDraft(latest.current.key);
      setStored(null);
    },
  };
};
