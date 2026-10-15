import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'field-note-theme';

const readStoredMode = (): ThemeMode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
};

// 선택한 테마를 html 요소의 dark 클래스에 반영 (시스템 설정이면 기기 설정을 따름)
export const applyTheme = (mode: ThemeMode) => {
  const isDark =
    mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
};

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  mode: readStoredMode(),
  setMode: (mode) => {
    try {
      if (mode === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // 저장소를 쓸 수 없어도 이번 접속 동안은 적용
    }
    applyTheme(mode);
    set({ mode });
  },
}));

// 기기의 다크 모드 설정이 바뀌면 시스템 테마 선택 상태에서 바로 반영, 해제 함수 반환
export const watchSystemTheme = () => {
  const query = matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (useThemeStore.getState().mode === 'system') applyTheme('system');
  };
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
