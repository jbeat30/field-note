import type { Material, MaterialRecord } from '@field-note/shared';

// 스토리용 가짜 자재·기록
export const storyMaterial = (index: number, patch: Partial<Material> = {}): Material => ({
  id: `0198d000-0000-7000-8000-${String(index + 500).padStart(12, '0')}`,
  name: `자재 ${index}`,
  spec: null,
  unit: '장',
  category: 'RAW',
  isActive: true,
  lastUsedOn: null,
  ...patch,
});

export const storyRecord = (
  index: number,
  patch: Partial<MaterialRecord> = {},
): MaterialRecord => ({
  id: `0198d000-0000-7000-8000-${String(index + 900).padStart(12, '0')}`,
  projectId: '0198d000-0000-7000-8000-000000000304',
  materialId: storyMaterial(1).id,
  recordDate: '2026-10-07',
  kind: 'USED',
  quantity: 10,
  categoryId: null,
  area: null,
  partnerId: null,
  sourceText: null,
  isChange: false,
  isAfterService: false,
  memo: null,
  createdBy: '0198d000-0000-7000-8000-000000000001',
  createdAt: '2026-10-07T03:00:00.000Z',
  updatedAt: '2026-10-07T03:00:00.000Z',
  ...patch,
});
