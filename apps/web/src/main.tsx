import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { registerSW } from 'virtual:pwa-register';

import { App } from './App';
import './index.css';
import { enableMocking } from './mocks';
import { watchSystemTheme } from './stores/themeStore';

const root = document.getElementById('root');
if (!root) throw new Error('[web.main] root 요소 없음');

// 목업 모드에서는 가짜 서버가 준비된 뒤에 화면을 그려 첫 요청이 빠지지 않게 함
// 글꼴이 준비되면 화면을 보여 줌 (오래 걸려도 1.5초 뒤에는 보여 줌)
const showWhenFontsReady = () => {
  const reveal = () => document.documentElement.classList.remove('fonts-loading');
  const timer = window.setTimeout(reveal, 1500);

  // 첫 그리기 뒤에야 필요한 글꼴 조각의 내려받기가 시작되므로 한 프레임 기다림
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void document.fonts.ready.then(() => {
        window.clearTimeout(timer);
        reveal();
      });
    });
  });
};

document.documentElement.classList.add('fonts-loading');

void enableMocking().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  showWhenFontsReady();
});

watchSystemTheme();

// 앱 껍데기 캐시용 서비스 워커 등록 (새 버전은 자동 갱신)
registerSW({ immediate: true });
