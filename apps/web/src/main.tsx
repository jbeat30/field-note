import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { registerSW } from 'virtual:pwa-register';

import { App } from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('[web.main] root 요소 없음');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 앱 껍데기 캐시용 서비스 워커 등록 (새 버전은 자동 갱신)
registerSW({ immediate: true });
