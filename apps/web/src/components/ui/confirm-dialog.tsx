import { AlertDialog } from 'radix-ui';
import { useState } from 'react';

import { cn } from '../../lib/cn';

import { Button } from './button';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  // 되돌아가는 버튼 문구 (기본 "취소"), 취소가 어느 쪽을 뜻하는지 헷갈릴 때 구체적으로 적음
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmDialogProps = ConfirmOptions & {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// 되돌리기 어려운 동작 전에 한 번 더 확인하는 대화창, 포커스 가두기·Esc 닫기는 Radix가 처리
export const ConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
}: ConfirmDialogProps) => (
  <AlertDialog.Root open={open}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
      <AlertDialog.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm',
          '-translate-x-1/2 -translate-y-1/2 flex flex-col gap-3 rounded-xl bg-surface p-5 shadow-card',
        )}
      >
        <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
        {description && (
          <AlertDialog.Description className="text-sm text-sub">
            {description}
          </AlertDialog.Description>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <AlertDialog.Cancel asChild>
            <Button type="button" variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action asChild>
            <Button type="button" variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialog.Action>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);

// 확인 창을 열고 사용자 선택(확인/취소)을 Promise로 받는 훅
// 사용법: const { confirm, dialog } = useConfirm();
//         const ok = await confirm({ title: '지울까요?', danger: true, confirmLabel: '지우기' });
//         if (ok) remove();
//         return <>{dialog}</>;
export const useConfirm = () => {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(
    null,
  );

  const confirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });

  const dialog = state ? (
    <ConfirmDialog
      open
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      danger={state.danger}
      onConfirm={() => {
        const resolve = state.resolve;
        setState(null);
        resolve(true);
      }}
      onCancel={() => {
        const resolve = state.resolve;
        setState(null);
        resolve(false);
      }}
    />
  ) : null;

  return { confirm, dialog };
};
