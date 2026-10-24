import { useState, type ComponentProps } from 'react';

import { cn } from '../../lib/cn';

import { Input, type ControlSize } from './input';

type PasswordInputProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'startAdornment' | 'endAdornment'
>;

// 오른쪽 보기 버튼 자리 너비 (크기 단계별)
const BUTTON_PAD: Record<ControlSize, string> = {
  sm: 'pr-12',
  md: 'pr-14',
  lg: 'pr-16',
};

// 입력 중인 비밀번호를 보거나 숨기는 칸 (오른쪽 글자 버튼으로 전환, 기본은 숨김)
export const PasswordInput = ({ className, size = 'md', ...props }: PasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative w-full">
      <Input
        type={isVisible ? 'text' : 'password'}
        size={size}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn(BUTTON_PAD[size], className)}
        {...props}
      />
      <button
        type="button"
        aria-label={isVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center rounded-control px-4 text-sm font-semibold text-sub transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
      >
        {isVisible ? '숨기기' : '보기'}
      </button>
    </div>
  );
};
