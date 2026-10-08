import type { Photo } from '@field-note/shared';

export type ComparisonGroup = {
  // 구역 이름 (구역을 적지 않은 사진은 null)
  area: string | null;
  before: Photo[];
  after: Photo[];
};

/**
 * @description 작업 전·후 비교용으로 구역별로 묶음 (서비스 기획서 §12.2). 같은 구역의 "작업 전"과 "작업 후" 사진을 나란히 보여 주기 위한 그룹이며,
 * 한쪽만 있는 구역도 포함해 아직 찍지 않은 쪽을 알 수 있게 한다. 구역은 이름순(구역 없음은 맨 뒤), 사진은 촬영일시 오래된 순
 * @param photos 사진 목록 (구분이 작업 전·작업 후가 아닌 사진은 무시)
 * @returns 구역별 비교 그룹
 */
export const groupBeforeAfter = (photos: readonly Photo[]): ComparisonGroup[] => {
  const groups = new Map<string | null, ComparisonGroup>();

  for (const photo of photos) {
    if (photo.category !== 'BEFORE' && photo.category !== 'AFTER') continue;

    const group = groups.get(photo.area) ?? { area: photo.area, before: [], after: [] };

    (photo.category === 'BEFORE' ? group.before : group.after).push(photo);
    groups.set(photo.area, group);
  }

  const byTime = (a: Photo, b: Photo) =>
    a.takenAt.localeCompare(b.takenAt) || a.id.localeCompare(b.id);

  return [...groups.values()]
    .map((group) => ({
      ...group,
      before: [...group.before].sort(byTime),
      after: [...group.after].sort(byTime),
    }))
    .sort((a, b) => {
      if (a.area === null) return b.area === null ? 0 : 1;
      if (b.area === null) return -1;

      return a.area.localeCompare(b.area, 'ko');
    });
};
