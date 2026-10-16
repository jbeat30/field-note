import {
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABELS,
  type Photo,
  type PhotoCategory,
} from '@field-note/shared';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Chip } from '../components/ui/chip';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';
import { SegmentedControl } from '../components/ui/segmented-control';
import { seoulToday } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { useProject } from '../projects/useProjects';
import { BeforeAfterView } from '../photos/BeforeAfterView';
import { groupBeforeAfter } from '../photos/photoCompare';
import { PhotoDateGroups, groupPhotosByDate } from '../photos/PhotoDateGroups';
import { PhotoDetailDialog } from '../photos/PhotoDetailDialog';
import { useDeletePhoto, usePhotoList, useUpdatePhoto } from '../photos/usePhotos';

type View = 'ALL' | 'COMPARE';

const VIEWS: { value: View; label: string }[] = [
  { value: 'ALL', label: '날짜별' },
  { value: 'COMPARE', label: '전후 비교' },
];

// 프로젝트 사진첩: 하루 기록에서 올린 사진을 작업 날짜별로 모아 보고, 구분·구역으로 거르고, 작업 전·후를 비교함 (09 문서 §3.5)
export const ProjectPhotosPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [view, setView] = useState<View>('ALL');
  const [category, setCategory] = useState<PhotoCategory | null>(null);
  const [areaInput, setAreaInput] = useState('');
  const area = useDebouncedValue(areaInput.trim());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 비교 보기는 구분 필터 없이 작업 전·후를 모두 읽어야 함
  const photos = usePhotoList(
    id,
    {
      ...(view === 'ALL' && category ? { category } : {}),
      ...(area ? { area } : {}),
    },
    view === 'COMPARE' ? 100 : undefined,
  );
  const update = useUpdatePhoto();
  const remove = useDeletePhoto();
  const items = useMemo(
    () => photos.data?.pages.flatMap((page) => page.items) ?? [],
    [photos.data],
  );
  const groups = useMemo(() => groupBeforeAfter(items), [items]);
  // 앞뒤 넘기기는 화면에 보이는 순서(날짜 묶음 순) 기준
  const ordered = useMemo(
    () => (view === 'ALL' ? groupPhotosByDate(items).flatMap(([, own]) => own) : items),
    [items, view],
  );
  const selectedIndex = ordered.findIndex((photo) => photo.id === selectedId);
  const selected = ordered[selectedIndex] ?? null;
  const filtered = Boolean(category || area);

  if (project.isPending) {
    return <p className="text-sm">프로젝트를 불러오는 중</p>;
  }

  if (!project.data) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  const select = (photo: Photo) => setSelectedId(photo.id);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        level={2}
        title="사진첩"
        description="하루 기록에서 올린 작업 사진을 날짜별로 모아 봅니다. 사진은 하루 기록의 작업 사진 단계에서 올립니다"
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SegmentedControl
          aria-label="보기 방식"
          className="md:w-auto"
          value={view}
          onValueChange={setView}
          options={VIEWS}
        />
        <div className="md:ml-auto md:w-64">
          <Input
            type="search"
            aria-label="구역 찾기"
            placeholder="구역 찾기 (예: 301호)"
            startAdornment={<Search aria-hidden />}
            value={areaInput}
            onChange={(event) => setAreaInput(event.target.value)}
          />
        </div>
      </div>
      {view === 'ALL' && (
        <div role="group" aria-label="구분으로 거르기" className="flex flex-wrap gap-2">
          <Chip selected={category === null} onClick={() => setCategory(null)}>
            모든 구분
          </Chip>
          {PHOTO_CATEGORIES.map((value) => (
            <Chip
              key={value}
              selected={category === value}
              onClick={() => setCategory(category === value ? null : value)}
            >
              {PHOTO_CATEGORY_LABELS[value]}
            </Chip>
          ))}
        </div>
      )}
      {photos.isPending && <p className="text-sm">사진을 불러오는 중</p>}
      {photos.isError && <Alert>사진을 불러오지 못했습니다</Alert>}
      {photos.isSuccess && items.length === 0 && view === 'ALL' && (
        <EmptyState
          title={filtered ? '조건에 맞는 사진이 없습니다' : '아직 사진이 없습니다'}
          description={
            filtered
              ? '구분이나 구역을 바꿔 보세요'
              : '하루 기록의 작업 사진 단계에서 올린 사진이 여기에 모입니다'
          }
          action={
            !filtered && (
              <Link
                to={projectWorkPath(id, seoulToday())}
                className="text-sm font-semibold text-primary hover:underline"
              >
                오늘 하루 기록으로
              </Link>
            )
          }
        />
      )}
      {photos.isSuccess && view === 'ALL' && items.length > 0 && (
        <PhotoDateGroups projectId={id} photos={items} onSelect={select} />
      )}
      {photos.isSuccess && view === 'COMPARE' && (
        <BeforeAfterView groups={groups} onSelect={select} />
      )}
      {photos.hasNextPage && (
        <Button
          type="button"
          variant="secondary"
          className="self-center"
          disabled={photos.isFetchingNextPage}
          onClick={() => void photos.fetchNextPage()}
        >
          {photos.isFetchingNextPage ? '불러오는 중' : '더 보기'}
        </Button>
      )}
      {selected && (
        <PhotoDetailDialog
          key={selected.id}
          photo={selected}
          onClose={() => setSelectedId(null)}
          onSave={async (photoId, body) => void (await update.mutateAsync({ id: photoId, body }))}
          onDelete={async (photoId) => remove.mutateAsync(photoId)}
          onPrev={
            selectedIndex > 0 ? () => setSelectedId(ordered[selectedIndex - 1]!.id) : undefined
          }
          onNext={
            selectedIndex < ordered.length - 1
              ? () => setSelectedId(ordered[selectedIndex + 1]!.id)
              : undefined
          }
        />
      )}
    </div>
  );
};
