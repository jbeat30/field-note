import type { Photo, PhotoCategory } from '@field-note/shared';

// 스토리용 가짜 사진 (구분 색과 이름만 그린 이미지, 실제 현장 사진 아님)
const COLORS: Record<PhotoCategory, string> = {
  BEFORE: '#94a3b8',
  DURING: '#f59e0b',
  AFTER: '#22c55e',
  DEFECT: '#ef4444',
  MATERIAL: '#8b5cf6',
  SAFETY: '#0ea5e9',
  OTHER: '#64748b',
};

export const storyImage = (category: PhotoCategory, size = 240) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" fill="${COLORS[category]}"/></svg>`,
  )}`;

export const storyPhoto = (
  index: number,
  category: PhotoCategory,
  area: string | null,
  overrides: Partial<Photo> = {},
): Photo => ({
  id: `0198d000-0000-7000-8000-${String(index).padStart(12, '0')}`,
  projectId: '0198d000-0000-7000-8000-000000000304',
  fileId: `0198d000-0000-7000-8000-${String(index + 1000).padStart(12, '0')}`,
  category,
  area,
  takenAt: `2026-10-0${(index % 7) + 1}T01:00:00.000Z`,
  workDate: `2026-10-0${(index % 7) + 1}`,
  description: null,
  isCover: false,
  uploadedBy: '0198d000-0000-7000-8000-000000000001',
  createdAt: '2026-10-08T00:00:00.000Z',
  file: { status: 'READY', rejectReason: null, size: 120_000 },
  thumbnailUrl: storyImage(category),
  ...overrides,
});
