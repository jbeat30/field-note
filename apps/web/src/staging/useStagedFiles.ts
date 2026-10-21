import { useCallback, useEffect, useRef, useState } from 'react';

import { useDraftHydrated } from '../drafts/useLocalDraft';
import { useDraftStore } from '../stores/draftStore';

import {
  expiredFileIds,
  parseStaged,
  serializeStaged,
  stagedDraftKey,
  type StagedFile,
} from './stagedFiles';

type Options = {
  // 같은 폼을 다시 열었을 때 이어 쓰도록 임시 파일 목록을 기기에 기억하는 구분자
  scope: string;
  discard: (fileId: string) => Promise<unknown>;
};

/**
 * @description 폼의 임시 파일 목록: 올린 파일을 기기 초안에 기억해 새로고침·재접속 뒤에도 이어 쓰고,
 * 화면이 다시 보일 때 업로드 시각으로 만료를 계산함 (주기 확인·서버 호출 없음), 서버가 저장 때 최종 판정
 * @param options 초안 구분자, 서버 삭제 함수
 * @returns 목록·만료 표시와 추가·삭제·확정 함수
 */
export const useStagedFiles = ({ scope, discard }: Options) => {
  const key = stagedDraftKey(scope);
  const hydrated = useDraftHydrated();
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [expired, setExpired] = useState<ReadonlySet<string>>(new Set());
  const restored = useRef(false);
  const latest = useRef(files);

  const persist = useCallback(
    (next: StagedFile[]) => {
      latest.current = next;
      setFiles(next);

      const { setDraft, removeDraft } = useDraftStore.getState();

      if (next.length === 0) removeDraft(key);
      else setDraft(key, serializeStaged(next));
    },
    [key],
  );

  // 초안 저장소를 다 읽은 뒤 한 번 이어받음
  useEffect(() => {
    if (!hydrated || restored.current) return;

    restored.current = true;

    const saved = parseStaged(useDraftStore.getState().drafts[key]);

    if (saved.length > 0) {
      latest.current = saved;
      // 저장소를 읽은 뒤 한 번만 이어받는 초기화
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFiles(saved);
      setExpired(new Set(expiredFileIds(saved, new Date())));
    }
  }, [hydrated, key]);

  // 브라우저를 돌려놓고 다시 볼 때 업로드 시각으로 만료를 계산
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return;

      const ids = expiredFileIds(latest.current, new Date());

      setExpired((current) =>
        ids.length === current.size && ids.every((id) => current.has(id)) ? current : new Set(ids),
      );
    };

    document.addEventListener('visibilitychange', check);

    return () => document.removeEventListener('visibilitychange', check);
  }, []);

  return {
    files,
    expiredIds: expired,
    // 올린 파일을 목록에 더함 (초안에도 기억)
    add: (file: StagedFile) => persist([...latest.current, file]),
    // 목록에서 빼고 서버에서도 지움 (파일 교체·삭제)
    remove: async (fileId: string) => {
      persist(latest.current.filter((file) => file.fileId !== fileId));
      setExpired((current) => new Set([...current].filter((id) => id !== fileId)));
      await discard(fileId);
    },
    // 서버가 저장 때 만료로 판정한 파일을 표시 (다시 올릴 수 있게 목록에서는 유지)
    markExpired: (fileId: string) => setExpired((current) => new Set(current).add(fileId)),
    // 폼 저장으로 서버가 연결을 마쳤으므로 서버 삭제 없이 목록·초안만 비움
    release: () => {
      persist([]);
      setExpired(new Set());
    },
    // 폼을 취소하거나 이탈해 임시 파일을 모두 지움
    discardAll: async () => {
      const ids = latest.current.map((file) => file.fileId);

      persist([]);
      setExpired(new Set());
      await Promise.all(ids.map((id) => discard(id)));
    },
  };
};

export type StagedFiles = ReturnType<typeof useStagedFiles>;
