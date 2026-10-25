import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 767px)';

const subscribe = (onChange: () => void) => {
  const media = matchMedia(QUERY);

  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
};

// 화면 폭이 md(768px) 미만인지 (표 대신 카드 목록을 보일 때 사용)
export const useIsMobile = () =>
  useSyncExternalStore(
    subscribe,
    () => matchMedia(QUERY).matches,
    () => false,
  );
