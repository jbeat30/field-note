import { useEffect, useState } from 'react';

import { BrandLogo } from '../layouts/BrandLogo';

// 이 시간(ms) 안에 끝나면 아무것도 보이지 않음 (깜빡임 방지)
const SHOW_DELAY_MS = 400;

// 앱을 열 때 로그인 상태를 확인하는 동안의 화면: 주황 면, 번갈아 늘고 줄어드는 막대, 안내 문구, 아래 흐르는 막대
export const AuthChecking = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  if (!isVisible) {
    return <div role="status" aria-busy className="min-h-dvh bg-canvas" />;
  }

  return (
    <div
      role="status"
      className="plane relative flex min-h-dvh flex-col items-center justify-center gap-7 overflow-hidden"
    >
      <span className="absolute top-5 left-6">
        <BrandLogo />
      </span>
      <div aria-hidden className="auth-bars flex w-24 flex-col gap-3">
        <i className="bg-[#14110d]" />
        <i className="bg-[#14110d]" />
        <i className="bg-surface" />
      </div>
      <div className="text-center">
        <b className="text-2xl font-extrabold tracking-[-0.01em]">로그인 상태를 확인하고 있어요</b>
        <p className="mt-2 text-[15px] font-medium text-[#3a2a1e]">잠시만 기다려 주세요</p>
      </div>
      <div
        aria-hidden
        className="absolute right-0 bottom-0 left-0 h-1.5 overflow-hidden bg-[#14110d]/15"
      >
        <i className="auth-slide block h-full w-2/5 bg-[#14110d]" />
      </div>
    </div>
  );
};
