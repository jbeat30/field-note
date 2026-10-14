import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { todayInSeoul } from '@field-note/shared';
import { Link, useMatch } from 'react-router';

import { Button } from '../components/ui/button';
import { projectWorkPath } from '../lib/projectPaths';
import { MemoForm } from '../memos/MemoForm';
import { memoDraftKey } from '../memos/memoDraft';
import { useCreateMemo } from '../memos/useMemos';
import { useUiStore } from '../stores/uiStore';

type Mode = 'MENU' | 'MEMO';

const linkClass =
  'flex min-h-touch items-center justify-center rounded-md bg-muted px-4 text-base font-medium text-foreground hover:bg-muted/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

// 빠른 추가: 어느 화면에서든 한 번에 "메모 / 사진 / 오늘 작업"으로 (서비스 기획서 §14). 프로젝트 화면에서는 그 프로젝트에 바로 연결하고, 아니면 메모함에 저장한다
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
        <Dialog.Overlay className="fixed inset-0 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 mx-auto flex max-w-xl flex-col gap-3 rounded-t-lg bg-surface p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-lg font-bold">
              {mode === 'MEMO' ? '메모 추가' : '빠른 추가'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button type="button" variant="secondary">
                닫기
              </Button>
            </Dialog.Close>
          </div>
          {mode === 'MENU' ? (
            <div className="grid grid-cols-1 gap-2">
              <Button type="button" onClick={() => setMode('MEMO')}>
                메모
              </Button>
              <Link
                className={linkClass}
                to={currentProject ? `/projects/${currentProject}/photos` : '/projects'}
                onClick={close}
              >
                {currentProject ? '사진' : '사진 (프로젝트 고르기)'}
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
              </Link>
              <Link
                className={linkClass}
                to={currentProject ? `/projects/${currentProject}/materials` : '/projects'}
                onClick={close}
              >
                {currentProject ? '자재' : '자재 (프로젝트 고르기)'}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground/70">
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
