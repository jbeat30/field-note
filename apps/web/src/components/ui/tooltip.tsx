import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

type TooltipProps = {
  // 마우스를 올리거나 키보드로 초점이 가면 보이는 설명
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
};

// 아이콘 버튼 같은 곳에 짧은 설명 추가, 설명이 꼭 필요한 정보는 화면에 글자로 표시하고 여기에는 보조 설명만 배치
export const Tooltip = ({ content, children, side = 'top' }: TooltipProps) => (
  <TooltipPrimitive.Provider delayDuration={300}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-64 rounded-md bg-foreground px-3 py-1.5 text-xs font-bold text-surface shadow-pop"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);
