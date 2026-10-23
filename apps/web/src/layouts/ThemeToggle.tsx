import { Moon, Sun } from 'lucide-react';

import { Button } from '../components/ui/button';
import { useThemeStore } from '../stores/themeStore';

// 화면 테마를 밝게 ↔ 어둡게 전환하는 버튼, 처음에는 기기 설정을 따르고 선택하면 값 저장
export const ThemeToggle = ({ className }: { className?: string }) => {
  const mode = useThemeStore((state) => state.mode);
  const isDark =
    mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const Icon = isDark ? Sun : Moon;

  return (
    <Button
      type="button"
      variant="ghost"
      className={className}
      aria-label={isDark ? '밝은 화면으로 전환' : '어두운 화면으로 전환'}
      onClick={() => useThemeStore.getState().setMode(isDark ? 'light' : 'dark')}
    >
      <Icon aria-hidden className="size-5" />
    </Button>
  );
};
