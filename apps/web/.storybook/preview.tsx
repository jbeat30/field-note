import type { Preview } from '@storybook/react-vite';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { MemoryRouter, Route, Routes } from 'react-router';
import { configure } from 'storybook/test';

import { handlers } from '../src/mocks/handlers';
import { resetMockMaterials } from '../src/mocks/materialHandlers';
import { resetMockMemos } from '../src/mocks/memoHandlers';
import { resetMockPhotos } from '../src/mocks/photoHandlers';
import { resetMockState } from '../src/mocks/state';
import { AppProviders } from '../src/AppProviders';
import { createQueryClient } from '../src/query/queryClient';
import '../src/index.css';

// 비동기 조회(findBy*)의 기본 대기는 1초라 CI처럼 느린 환경에서 흔들린다. 요청이 많은 화면을 위해 넉넉하게 둔다
configure({ asyncUtilTimeout: 5000 });

const preview: Preview = {
  // API 응답은 스토리마다 msw 핸들러로 가짜 응답을 준다 (기본은 목업 서버 전체)
  loaders: [
    () => {
      // 스토리끼리 가짜 서버 상태(로그인·가입)가 섞이지 않게 초기화
      resetMockState();
      resetMockPhotos();
      resetMockMemos();
      resetMockMaterials();
    },
    mswLoader(),
  ],
  decorators: [
    // 스토리마다 새 QueryClient를 만들어 캐시가 서로 영향을 주지 않게 함
    (Story, { parameters }) => {
      const router = parameters.router as { initialEntries?: string[]; path?: string } | undefined;

      return (
        <AppProviders queryClient={createQueryClient()}>
          <MemoryRouter initialEntries={router?.initialEntries ?? ['/']}>
            <Routes>
              <Route path={router?.path ?? '*'} element={<Story />} />
              <Route path="*" element={<p data-testid="navigated">이동함</p>} />
            </Routes>
          </MemoryRouter>
        </AppProviders>
      );
    },
  ],
  parameters: {
    layout: 'padded',
    msw: { handlers },
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
