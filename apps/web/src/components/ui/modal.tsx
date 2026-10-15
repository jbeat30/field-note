import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  // auto: 좁은 화면은 아래에서 올라오는 시트, 넓은 화면은 가운데 창 (기본)
  // dialog: 늘 가운데 창, sheet: 늘 시트
  variant?: 'auto' | 'dialog' | 'sheet';
  // 가운데 창 너비 (입력 칸이 많은 폼은 lg)
  size?: 'md' | 'lg';
  children: ReactNode;
};

const SHEET =
  'inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-xl pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-sheet';
const DIALOG =
  'top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-card';
// 넓은 화면에서만 가운데 창 (auto)
const DIALOG_MD =
  'md:top-1/2 md:left-1/2 md:mx-0 md:w-[calc(100%-2rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:shadow-card';

// 대화창·시트 공통, 포커스 가두기·Esc 닫기·제목 연결은 Radix가 처리
export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  variant = 'auto',
  size = 'md',
  children,
}: ModalProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-20 bg-overlay print:hidden" />
      <Dialog.Content
        // 설명이 없으면 Radix 경고를 피하려고 연결을 끊음
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'fixed z-20 flex max-h-[88dvh] flex-col gap-4 overflow-y-auto bg-surface p-5 print:hidden',
          variant === 'sheet' && SHEET,
          variant === 'dialog' && DIALOG,
          variant === 'auto' && `${SHEET} md:right-auto md:bottom-auto md:pb-5 ${DIALOG_MD}`,
          size === 'lg' ? 'md:max-w-2xl' : 'md:max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          <Dialog.Close
            aria-label="닫기"
            className="-mt-1.5 -mr-1.5 flex size-10 shrink-0 items-center justify-center rounded-md text-foreground/65 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
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
