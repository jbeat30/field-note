import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('[web.main] root 요소 없음');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
