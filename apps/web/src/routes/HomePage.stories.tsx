import type { Meta, StoryObj } from '@storybook/react-vite';
import { delay, http, HttpResponse } from 'msw';

import { HomePage } from './HomePage';

const meta = { title: 'Pages/HomePage 상태', component: HomePage } satisfies Meta<typeof HomePage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 서버 상태 표시의 로딩·성공·오류를 msw 가짜 응답으로 점검
export const Success: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/health', () =>
          HttpResponse.json({ status: 'ok', service: 'field-note' }),
        ),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/health', async () => {
          await delay('infinite');
          return HttpResponse.json({});
        }),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/health', () =>
          HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: '일시적인 오류가 발생했습니다' } },
            { status: 500 },
          ),
        ),
      ],
    },
  },
};
