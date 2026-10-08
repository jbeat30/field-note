import type { Photo } from '@field-note/shared';

import { groupBeforeAfter } from './photoCompare';

const photo = (
  id: string,
  category: Photo['category'],
  area: string | null,
  takenAt: string,
): Photo => ({
  id,
  projectId: 'p',
  fileId: `f-${id}`,
  category,
  area,
  takenAt,
  workDate: takenAt.slice(0, 10),
  description: null,
  isCover: false,
  uploadedBy: 'u',
  createdAt: takenAt,
  file: { status: 'READY', rejectReason: null, size: 1 },
  thumbnailUrl: null,
});

describe('작업 전·후 비교 묶음', () => {
  it('같은 구역의 작업 전·후 사진을 나란히 묶고 사진은 오래된 순으로 둔다', () => {
    const groups = groupBeforeAfter([
      photo('a2', 'AFTER', '301호', '2026-10-07T01:00:00Z'),
      photo('b2', 'BEFORE', '301호', '2026-10-05T02:00:00Z'),
      photo('b1', 'BEFORE', '301호', '2026-10-05T01:00:00Z'),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.before.map((item) => item.id)).toEqual(['b1', 'b2']);
    expect(groups[0]!.after.map((item) => item.id)).toEqual(['a2']);
  });

  it('작업 전·후가 아닌 구분은 빼고 한쪽만 있는 구역도 남긴다', () => {
    const groups = groupBeforeAfter([
      photo('x', 'SAFETY', '301호', '2026-10-05T01:00:00Z'),
      photo('d', 'DURING', '301호', '2026-10-05T01:00:00Z'),
      photo('b', 'BEFORE', '302호', '2026-10-05T01:00:00Z'),
    ]);

    expect(groups.map((group) => [group.area, group.before.length, group.after.length])).toEqual([
      ['302호', 1, 0],
    ]);
  });

  it('구역은 이름순이고 구역을 적지 않은 사진은 맨 뒤에 모은다', () => {
    const groups = groupBeforeAfter([
      photo('n', 'BEFORE', null, '2026-10-05T01:00:00Z'),
      photo('b', 'BEFORE', '다동', '2026-10-05T01:00:00Z'),
      photo('a', 'AFTER', '가동', '2026-10-05T01:00:00Z'),
    ]);

    expect(groups.map((group) => group.area)).toEqual(['가동', '다동', null]);
  });
});
