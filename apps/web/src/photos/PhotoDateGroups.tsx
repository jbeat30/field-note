import type { Photo } from '@field-note/shared';
import { Link } from 'react-router';

import { formatLongDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';

import { PhotoGrid } from './PhotoGrid';

type PhotoDateGroupsProps = {
  projectId: string;
  photos: readonly Photo[];
  onSelect: (photo: Photo) => void;
};

/**
 * @description 사진을 작업 날짜별로 묶음 (최근 날짜가 맨 앞, 묶음 안은 받은 순서 그대로)
 * @param photos 사진 목록
 * @returns [작업 날짜, 사진들] 목록
 */
export const groupPhotosByDate = (photos: readonly Photo[]) => {
  const groups = new Map<string, Photo[]>();

  for (const photo of photos) {
    groups.set(photo.workDate, [...(groups.get(photo.workDate) ?? []), photo]);
  }

  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
};

// 사진첩 본문: 작업 날짜마다 머리(날짜·장 수·그날 작업 기록으로 가기)와 썸네일
export const PhotoDateGroups = ({ projectId, photos, onSelect }: PhotoDateGroupsProps) => (
  <div className="flex flex-col gap-6">
    {groupPhotosByDate(photos).map(([date, items]) => (
      <section
        key={date}
        aria-label={`${formatLongDay(date)} 사진`}
        className="flex flex-col gap-2"
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="font-semibold">{formatLongDay(date)}</h3>
          <span className="text-sm text-sub">{items.length}장</span>
          <Link
            to={projectWorkPath(projectId, date)}
            className="ml-auto text-sm font-medium text-primary hover:underline"
          >
            작업 기록 보기
          </Link>
        </div>
        <PhotoGrid photos={items} onSelect={onSelect} />
      </section>
    ))}
  </div>
);
