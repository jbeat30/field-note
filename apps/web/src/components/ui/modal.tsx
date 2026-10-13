import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  // dialog: 가운데 창, sheet: 아래에서 올라오는 시트 (모바일 기본)
  variant?: 'dialog' | 'sheet';
  children: ReactNode;
};

// 대화창·시트 공통. 포커스 가두기·Esc 닫기·제목 연결은 Radix가 처리
export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  variant = 'dialog',
  children,
}: ModalProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-20 bg-overlay print:hidden" />
      <Dialog.Content
        // 설명이 없으면 Radix 경고를 피하려고 연결을 끊음
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'fixed z-20 flex max-h-[85dvh] flex-col gap-3 overflow-y-auto bg-surface p-4 print:hidden',
          variant === 'sheet'
            ? 'inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-xl pb-[max(1rem,env(safe-area-inset-bottom))] shadow-sheet'
            : 'top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-card',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
          <Dialog.Close
            aria-label="닫기"
            className="flex size-touch shrink-0 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X aria-hidden className="size-5" />
          </Dialog.Close>
        </div>
        {description && (
          <Dialog.Description className="text-sm text-foreground/70">
            {description}
          </Dialog.Description>
        )}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
