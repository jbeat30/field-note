import { PHOTO_CATEGORY_LABELS, type Photo } from '@field-note/shared';

import { formatDay } from '../lib/dates';

type PhotoGridProps = {
  photos: readonly Photo[];
  onSelect: (photo: Photo) => void;
};

// 썸네일이 없는 사진(검사 중·거부)의 안내 문구
const placeholder = (photo: Photo) =>
  photo.file.status === 'REJECTED' ? '검사에서 거부됨' : '처리 중';

// 사진 썸네일 그리드: 한 줄에 3장(모바일), 사진을 누르면 상세. 느린 회선을 위해 이미지는 필요할 때 읽음
export const PhotoGrid = ({ photos, onSelect }: PhotoGridProps) => (
  <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
    {photos.map((photo) => (
      <li key={photo.id}>
        <button
          type="button"
          onClick={() => onSelect(photo)}
          className="relative block aspect-square w-full overflow-hidden rounded-md border border-border bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={`${PHOTO_CATEGORY_LABELS[photo.category]} ${photo.area ?? ''} ${formatDay(photo.workDate)} 사진 열기`}
        >
          {photo.thumbnailUrl ? (
            <img
              src={photo.thumbnailUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center p-1 text-center text-xs text-foreground/70">
              {placeholder(photo)}
            </span>
          )}
          <span className="absolute bottom-0 left-0 right-0 truncate bg-foreground/70 px-1 py-0.5 text-left text-xs text-primary-foreground">
            {PHOTO_CATEGORY_LABELS[photo.category]}
            {photo.area ? ` · ${photo.area}` : ''}
          </span>
          {photo.isCover && (
            <span className="absolute left-1 top-1 rounded bg-primary px-1 text-xs text-primary-foreground">
              대표
            </span>
          )}
        </button>
      </li>
    ))}
  </ul>
);
