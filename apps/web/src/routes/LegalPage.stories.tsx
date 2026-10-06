import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { LegalPage } from './LegalPage';

const meta = {
  title: 'Pages/약관·처리방침',
  component: LegalPage,
  parameters: { router: { initialEntries: ['/legal/privacy'], path: '/legal/:slug' } },
} satisfies Meta<typeof LegalPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PrivacyPolicy: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('heading', { name: '개인정보 수집·이용 동의' }),
    ).toBeInTheDocument();
    // 초안임을 알리고 확정 전 항목을 보여 줌
    await expect(canvas.getByText('초안입니다')).toBeInTheDocument();
    await expect(canvas.getByText(/개인정보 보호책임자\(운영자\)/)).toBeInTheDocument();
    // 수집 항목 표
    await expect(canvas.getByRole('columnheader', { name: '보유 기간' })).toBeInTheDocument();
    await expect(canvas.getAllByRole('row').length).toBeGreaterThan(4);
    // 수집하지 않는 정보와 해지 유예 안내
    await expect(
      canvas.getByText(/주민등록번호, 계좌번호, 건강·종교 등 민감정보는 수집하지 않습니다/),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText(/14일/).length).toBeGreaterThan(0);
  },
};

export const TermsOfService: Story = {
  parameters: { router: { initialEntries: ['/legal/terms'], path: '/legal/:slug' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', { name: '이용약관' })).toBeInTheDocument();
    await expect(
      canvas.getByRole('heading', { name: '제5조 (개인정보 처리 위탁)' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/버전 .* · 필수/)).toBeInTheDocument();
  },
};

export const Marketing: Story = {
  parameters: { router: { initialEntries: ['/legal/marketing'], path: '/legal/:slug' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/버전 .* · 선택/)).toBeInTheDocument();
    await expect(
      canvas.getByText(/현재 서비스는 광고성 정보를 보내지 않습니다/),
    ).toBeInTheDocument();
  },
};

export const UnknownDocument: Story = {
  parameters: { router: { initialEntries: ['/legal/unknown'], path: '/legal/:slug' } },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: '문서를 찾을 수 없습니다' }),
    ).toBeInTheDocument();
  },
};
