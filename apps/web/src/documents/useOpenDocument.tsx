import { Dialog } from 'radix-ui';
import { useState, type ReactNode } from 'react';

import { Button } from '../components/ui/button';
import { getErrorDetailMessage } from '../lib/apiError';

import { fetchDocumentAccess } from './useDocuments';

type Mode = 'view' | 'download';
type Target = { id: string; title: string; isSensitive: boolean };

type OpenDocument = {
  // 문서의 특정 버전을 열거나 내려받음. 민감 자료는 기록이 남는다는 확인을 먼저 받는다
  open: (document: Target, versionNo: number, mode: Mode) => void;
  // 확인 대화 상자 (화면 어딘가에 한 번 그려 줘야 함)
  dialog: ReactNode;
  error: string | null;
};

/**
 * @description 문서 열람·내려받기 흐름: 민감 자료는 "열람 기록이 남습니다" 확인을 받은 뒤 주소를 받아 연다.
 * 열기는 새 창을 클릭 순간에 미리 열어 두었다가 주소를 받으면 이동시킨다 (비동기 뒤에 열면 모바일 브라우저가 차단하므로)
 * @returns 열기 함수, 확인 대화 상자, 오류 문구
 */
export const useOpenDocument = (): OpenDocument => {
  const [pending, setPending] = useState<{ target: Target; versionNo: number; mode: Mode } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const run = async (target: Target, versionNo: number, mode: Mode) => {
    setError(null);

    // 새 창은 사용자의 클릭과 같은 순간에 열어야 차단되지 않음
    const popup = mode === 'view' ? window.open('', '_blank') : null;

    try {
      const { url } = await fetchDocumentAccess(target.id, versionNo, mode);

      if (popup) {
        popup.opener = null;
        popup.location.href = url;
      } else {
        // 내려받기는 첨부 파일 응답이라 현재 화면이 바뀌지 않음
        window.location.assign(url);
      }
    } catch (caught) {
      popup?.close();
      setError(getErrorDetailMessage(caught));
    }
  };

  return {
    open: (target, versionNo, mode) => {
      if (target.isSensitive) {
        setPending({ target, versionNo, mode });

        return;
      }

      void run(target, versionNo, mode);
    },
    error,
    dialog: pending && (
      <Dialog.Root open onOpenChange={(open) => !open && setPending(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-foreground/50" />
          <Dialog.Content
            className="fixed inset-x-0 bottom-0 mx-auto flex max-w-xl flex-col gap-3 rounded-t-lg bg-surface p-4"
            aria-describedby="sensitive-description"
          >
            <Dialog.Title className="text-lg font-bold">민감 자료입니다</Dialog.Title>
            <p id="sensitive-description" className="text-base">
              ‘{pending.target.title}’ 문서를 {pending.mode === 'download' ? '내려받으면' : '열면'}{' '}
              누가 언제 열었는지 기록이 남습니다. 계속할까요?
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  const next = pending;

                  setPending(null);
                  void run(next.target, next.versionNo, next.mode);
                }}
              >
                기록을 남기고 {pending.mode === 'download' ? '내려받기' : '열기'}
              </Button>
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  취소
                </Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    ),
  };
};
