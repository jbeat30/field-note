import type { Document, DocumentVersion } from '@field-note/shared';

// 스토리용 가짜 문서
export const storyVersion = (
  versionNo: number,
  patch: Partial<DocumentVersion> = {},
): DocumentVersion => ({
  versionNo,
  fileId: `0198d000-0000-7000-8000-${String(versionNo + 700).padStart(12, '0')}`,
  fileName: `시공도_rev${versionNo}.pdf`,
  contentType: 'application/pdf',
  size: 350_000,
  fileStatus: 'READY',
  rejectReason: null,
  revisionDate: '2026-10-02',
  reason: null,
  uploadedBy: '0198d000-0000-7000-8000-000000000001',
  createdAt: '2026-10-02T03:00:00.000Z',
  ...patch,
});

export const storyDocument = (index: number, patch: Partial<Document> = {}): Document => ({
  id: `0198d000-0000-7000-8000-${String(index + 600).padStart(12, '0')}`,
  projectId: '0198d000-0000-7000-8000-000000000304',
  category: 'DRAWING',
  title: `문서 ${index}`,
  isSensitive: false,
  isPinned: false,
  createdBy: '0198d000-0000-7000-8000-000000000001',
  createdAt: '2026-10-02T03:00:00.000Z',
  updatedAt: '2026-10-02T03:00:00.000Z',
  versionCount: 1,
  latest: storyVersion(1),
  ...patch,
});
