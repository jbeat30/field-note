import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { todayInSeoul } from '@field-note/shared';
import { Link, useMatch } from 'react-router';

import { ChevronRight, X } from 'lucide-react';

import { projectWorkPath } from '../lib/projectPaths';
import { MemoForm } from '../memos/MemoForm';
import { memoDraftKey } from '../memos/memoDraft';
import { useCreateMemo } from '../memos/useMemos';
import { useUiStore } from '../stores/uiStore';

type Mode = 'MENU' | 'MEMO';

const linkClass =
  'flex min-h-14 items-center justify-between rounded-2xl bg-surface-nested px-4 text-[15px] font-bold text-foreground hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground';

// 빠른 추가: 어느 화면에서든 한 번에 "메모 / 사진 / 오늘 작업" 이동, 프로젝트 화면에서는 해당 프로젝트에 바로 연결하고 그 밖은 메모함에 저장
export const QuickAddSheet = () => {
  const isOpen = useUiStore((state) => state.isQuickAddOpen);
  const setOpen = useUiStore((state) => state.setQuickAddOpen);
  const [mode, setMode] = useState<Mode>('MENU');
  const create = useCreateMemo();
  const projectId = useMatch('/projects/:id/*')?.params.id;
  // 프로젝트 등록 화면(/projects/new)은 프로젝트가 아님
  const currentProject = projectId && projectId !== 'new' ? projectId : undefined;

  const close = () => {
    setOpen(false);
    setMode('MENU');
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => (open ? setOpen(true) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-h-dvh max-w-xl flex-col gap-4 overflow-y-auto rounded-t-[30px] bg-surface-subtle p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-sheet"
        >
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-[21px] font-bold tracking-[-0.025em]">
              {mode === 'MEMO' ? '메모 추가' : '빠른 추가'}
            </Dialog.Title>
            <Dialog.Close
              aria-label="닫기"
              className="flex size-10 items-center justify-center rounded-full text-sub hover:bg-field hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          {mode === 'MENU' ? (
            <div className="grid grid-cols-1 gap-2">
              <button type="button" className={linkClass} onClick={() => setMode('MEMO')}>
                메모
                <ChevronRight aria-hidden className="size-5 text-sub" />
              </button>
              <Link
                className={linkClass}
                to={currentProject ? `/projects/${currentProject}/photos` : '/projects'}
                onClick={close}
              >
                {currentProject ? '사진' : '사진 (프로젝트 고르기)'}
                <ChevronRight aria-hidden className="size-5 text-sub" />
              </Link>
              <Link
                className={linkClass}
                to={
                  currentProject
                    ? projectWorkPath(currentProject, todayInSeoul(new Date()))
                    : '/projects'
                }
                onClick={close}
              >
                {currentProject ? '오늘 작업' : '오늘 작업 (프로젝트 고르기)'}
                <ChevronRight aria-hidden className="size-5 text-sub" />
              </Link>
              <Link
                className={linkClass}
                to={currentProject ? `/projects/${currentProject}/materials` : '/projects'}
                onClick={close}
              >
                {currentProject ? '자재' : '자재 (프로젝트 고르기)'}
                <ChevronRight aria-hidden className="size-5 text-sub" />
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-sub">
                {currentProject
                  ? '이 프로젝트의 메모 노트에 저장합니다'
                  : '프로젝트를 고르면 해당 메모 노트에 저장됩니다'}
              </p>
              <MemoForm
                autoFocus
                draftKey={memoDraftKey(currentProject)}
                submitLabel="저장"
                onSubmit={async (value) => {
                  await create.mutateAsync({ ...value, projectId: currentProject });
                  close();
                }}
              />
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
