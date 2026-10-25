import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';

import { cn } from '../../lib/cn';

import { Input, type ControlSize } from './input';

type PasswordInputProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'startAdornment' | 'endAdornment'
>;

// 오른쪽 보기 버튼 자리 너비 (크기 단계별)
const BUTTON_PAD: Record<ControlSize, string> = {
  sm: 'pr-10',
  md: 'pr-12',
  lg: 'pr-14',
};

// 입력 중인 비밀번호를 보거나 숨기는 칸 (오른쪽 눈 아이콘 버튼으로 전환, 기본은 숨김)
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
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-control text-sub transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-foreground"
      >
        {isVisible ? (
          <EyeOff aria-hidden className="size-5" />
        ) : (
          <Eye aria-hidden className="size-5" />
        )}
      </button>
    </div>
  );
};
