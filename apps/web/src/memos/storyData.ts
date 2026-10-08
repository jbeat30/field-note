import type { Memo } from '@field-note/shared';

// 스토리용 가짜 메모
export const storyMemo = (index: number, patch: Partial<Memo> = {}): Memo => ({
  id: `0198d000-0000-7000-8000-${String(index).padStart(12, '0')}`,
  projectId: null,
  content: `메모 ${index}`,
  tag: 'OTHER',
  memoDate: '2026-10-07',
  isDone: false,
  doneAt: null,
  createdBy: '0198d000-0000-7000-8000-000000000001',
  createdAt: '2026-10-07T03:00:00.000Z',
  updatedAt: '2026-10-07T03:00:00.000Z',
  ...patch,
});
