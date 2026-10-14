import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Button } from './button';
import { Card, CardTitle } from './card';
import { EmptyState } from './empty-state';
import { ProgressBar } from './progress-bar';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './table';

const meta = { title: 'UI/Card·Table·Progress', component: Card } satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CardWithProgress: Story = {
  render: () => (
    <Card aria-labelledby="card-title" className="flex flex-col gap-3">
      <CardTitle id="card-title">A동 외장 판금 공사</CardTitle>
      <ProgressBar aria-label="소진율" value={85} tone="warning" />
      <p className="text-sm text-foreground/70">소진율 85%</p>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('progressbar', { name: '소진율' })).toBeVisible();
  },
};

export const ProgressOver100: Story = {
  render: () => <ProgressBar aria-label="소진율" value={130} tone="danger" />,
};

export const SimpleTable: Story = {
  render: () => (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>직원</TableHeaderCell>
          <TableHeaderCell>공수</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>김한빛</TableCell>
          <TableCell>12.5</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>이판금</TableCell>
          <TableCell>10</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('row')).toHaveLength(3);
  },
};

export const Empty: Story = {
  render: () => (
    <EmptyState
      title="아직 등록된 직원이 없습니다"
      description="이름만 적어도 등록할 수 있습니다"
      action={<Button>직원 등록</Button>}
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  ),
};
