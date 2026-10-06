import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { registerSW } from 'virtual:pwa-register';

import { App } from './App';
import './index.css';
import { enableMocking } from './mocks';

const root = document.getElementById('root');
if (!root) throw new Error('[web.main] root 요소 없음');

// 목업 모드에서는 가짜 서버가 준비된 뒤에 화면을 그려 첫 요청이 빠지지 않게 함
void enableMocking().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

// 앱 껍데기 캐시용 서비스 워커 등록 (새 버전은 자동 갱신)
registerSW({ immediate: true });
