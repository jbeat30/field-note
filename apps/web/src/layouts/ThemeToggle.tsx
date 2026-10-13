import { Monitor, Moon, Sun } from 'lucide-react';

import { Button } from '../components/ui/button';
import { useThemeStore, type ThemeMode } from '../stores/themeStore';

const NEXT_MODE: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<ThemeMode, string> = { system: '기기 설정', light: '밝게', dark: '어둡게' };
const ICON = { system: Monitor, light: Sun, dark: Moon };

// 화면 테마를 기기 설정 → 밝게 → 어둡게 순서로 바꾸는 버튼
export const ThemeToggle = () => {
  const mode = useThemeStore((state) => state.mode);
  const Icon = ICON[mode];

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={`화면 테마: ${LABEL[mode]} (누르면 ${LABEL[NEXT_MODE[mode]]})`}
      onClick={() => useThemeStore.getState().setMode(NEXT_MODE[mode])}
    >
      <Icon aria-hidden className="size-5" />
    </Button>
  );
};
