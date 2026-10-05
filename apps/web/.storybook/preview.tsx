import type { Preview } from '@storybook/react-vite';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { MemoryRouter } from 'react-router';

import { AppProviders } from '../src/AppProviders';
import { createQueryClient } from '../src/query/queryClient';
import '../src/index.css';

const preview: Preview = {
  // API 응답은 스토리마다 msw 핸들러로 가짜 응답을 준다
  loaders: [mswLoader()],
  decorators: [
    // 스토리마다 새 QueryClient를 만들어 캐시가 서로 영향을 주지 않게 함
    (Story) => (
      <AppProviders queryClient={createQueryClient()}>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </AppProviders>
    ),
  ],
  parameters: {
    layout: 'padded',
    viewport: {
      options: {
        mobile: { name: '모바일', styles: { width: '390px', height: '844px' }, type: 'mobile' },
        desktop: {
          name: '데스크톱',
          styles: { width: '1280px', height: '800px' },
          type: 'desktop',
        },
      },
    },
    // 접근성 위반은 경고가 아니라 실패로 처리
    a11y: { test: 'error' },
  },
  initialGlobals: { viewport: { value: 'mobile', isRotated: false } },
};

export default preview;
