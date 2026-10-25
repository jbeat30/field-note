import { Moon, Sun } from 'lucide-react';

import { cn } from '../lib/cn';
import { useThemeStore, type ThemeMode } from '../stores/themeStore';

const OPTIONS = [
  { mode: 'light', label: '밝은 화면', icon: Sun },
  { mode: 'dark', label: '어두운 화면', icon: Moon },
] as const satisfies readonly { mode: ThemeMode; label: string; icon: typeof Sun }[];

// 화면 모드 스위치: 해(밝음)와 달(어두움) 두 칸만 있고 자동 칸은 없음, 처음에는 기기 설정에 맞춰 한 칸이 켜져 있음
export const ThemeSwitch = ({ className }: { className?: string }) => {
  const mode = useThemeStore((state) => state.mode);
  const isDark =
    mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const current: ThemeMode = isDark ? 'dark' : 'light';

  return (
    <span
      role="radiogroup"
      aria-label="화면 모드"
      className={cn('inline-flex rounded-full bg-field p-1', className)}
    >
      {OPTIONS.map(({ mode: value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          aria-label={label}
          onClick={() => useThemeStore.getState().setMode(value)}
          className={cn(
            'inline-flex size-11 items-center justify-center rounded-full transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
            current === value ? 'bg-[#14110d] text-accent' : 'text-sub hover:text-foreground',
          )}
        >
          <Icon aria-hidden className="size-5" />
        </button>
      ))}
    </span>
  );
};
