import type { Photo } from '@field-note/shared';

import { formatDay } from '../lib/dates';

import type { ComparisonGroup } from './photoCompare';

type BeforeAfterViewProps = {
  groups: readonly ComparisonGroup[];
  onSelect: (photo: Photo) => void;
};

const Side = ({
  title,
  photos,
  onSelect,
}: {
  title: string;
  photos: readonly Photo[];
  onSelect: (photo: Photo) => void;
}) => (
  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
    <h4 className="text-sm font-medium">{title}</h4>
    {photos.length === 0 ? (
      <p className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border p-2 text-center text-xs text-foreground/70">
        아직 사진이 없습니다
      </p>
    ) : (
      <ul className="flex flex-col gap-1.5">
        {photos.map((photo) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => onSelect(photo)}
              className="relative block aspect-square w-full overflow-hidden rounded-md border border-border bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={`${title} ${formatDay(photo.workDate)} 사진 열기`}
            >
              {photo.thumbnailUrl ? (
                <img
                  src={photo.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-xs">처리 중</span>
              )}
              <span className="absolute bottom-0 left-0 right-0 bg-foreground/70 px-1 py-0.5 text-left text-xs text-primary-foreground">
                {formatDay(photo.workDate)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// 작업 전·후 비교: 같은 구역의 전/후 사진을 좌우로 나란히 (한쪽이 비어 있으면 아직 안 찍은 쪽을 알려 줌)
export const BeforeAfterView = ({ groups, onSelect }: BeforeAfterViewProps) => {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-foreground/70">
        작업 전·작업 후 사진이 아직 없습니다. 사진을 올릴 때 구분을 고르면 구역별로 나란히 볼 수
        있습니다
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {groups.map((group) => (
        <li key={group.area ?? '__none__'} className="flex flex-col gap-2">
          <h3 className="text-base font-bold">{group.area ?? '구역 없음'}</h3>
          <div className="flex gap-2">
            <Side title="작업 전" photos={group.before} onSelect={onSelect} />
            <Side title="작업 후" photos={group.after} onSelect={onSelect} />
          </div>
        </li>
      ))}
    </ul>
  );
};
