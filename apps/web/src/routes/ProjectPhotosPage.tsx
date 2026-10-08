import {
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABELS,
  type Photo,
  type PhotoCategory,
} from '@field-note/shared';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { useProject } from '../projects/useProjects';
import { BeforeAfterView } from '../photos/BeforeAfterView';
import { enqueueFiles } from '../photos/enqueueFiles';
import { groupBeforeAfter } from '../photos/photoCompare';
import { PhotoDetailDialog } from '../photos/PhotoDetailDialog';
import { PhotoGrid } from '../photos/PhotoGrid';
import { getPhotoUploadQueue, usePhotoUploadItems } from '../photos/photoUploadQueue';
import { PhotoUploader } from '../photos/PhotoUploader';
import { UploadQueuePanel } from '../photos/UploadQueuePanel';
import { useDeletePhoto, usePhotoList, useUpdatePhoto } from '../photos/usePhotos';

type View = 'ALL' | 'COMPARE';

// 프로젝트 사진첩: 사진 올리기(대기열), 구분별 보기, 작업 전·후 비교 (서비스 기획서 §12.2)
export const ProjectPhotosPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [view, setView] = useState<View>('ALL');
  const [category, setCategory] = useState<PhotoCategory | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queueItems = usePhotoUploadItems().filter((item) => item.projectId === id);
  const queue = getPhotoUploadQueue();
  // 비교 보기는 구분 필터 없이 작업 전·후를 모두 읽어야 함
  const photos = usePhotoList(
    id,
    view === 'ALL' && category ? { category } : {},
    view === 'COMPARE' ? 100 : undefined,
  );
  const update = useUpdatePhoto();
  const remove = useDeletePhoto();
  const items = useMemo(
    () => photos.data?.pages.flatMap((page) => page.items) ?? [],
    [photos.data],
  );
  const groups = useMemo(() => groupBeforeAfter(items), [items]);
  const selected = items.find((photo) => photo.id === selectedId) ?? null;

  if (project.isPending) {
    return <p className="text-sm">프로젝트를 불러오는 중</p>;
  }

  if (!project.data) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  const select = (photo: Photo) => setSelectedId(photo.id);

  return (
    <div className="flex flex-col gap-4">
      <Link
        className="min-h-touch content-center text-sm text-primary underline"
        to={`/projects/${id}`}
      >
        ← {project.data.name}
      </Link>
      <h1 className="text-2xl font-bold">사진첩</h1>
      <PhotoUploader onSelect={(files, settings) => enqueueFiles(queue, id, files, settings)} />
      <UploadQueuePanel
        items={queueItems}
        onRetry={(itemId) => void queue.retry(itemId)}
        onCancel={(itemId) => void queue.cancel(itemId)}
        onClearDone={queue.clearDone}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="보기 방식" className="flex gap-2">
          <Button
            type="button"
            variant={view === 'ALL' ? 'primary' : 'secondary'}
            aria-pressed={view === 'ALL'}
            onClick={() => setView('ALL')}
          >
            전체
          </Button>
          <Button
            type="button"
            variant={view === 'COMPARE' ? 'primary' : 'secondary'}
            aria-pressed={view === 'COMPARE'}
            onClick={() => setView('COMPARE')}
          >
            전후 비교
          </Button>
        </div>
        {view === 'ALL' && (
          <Select
            className="w-auto"
            aria-label="구분으로 거르기"
            value={category}
            onChange={(event) => setCategory(event.target.value as PhotoCategory | '')}
          >
            <option value="">모든 구분</option>
            {PHOTO_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {PHOTO_CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
        )}
      </div>
      {photos.isPending && <p className="text-sm">사진을 불러오는 중</p>}
      {photos.isError && <Alert>사진을 불러오지 못했습니다</Alert>}
      {photos.isSuccess && items.length === 0 && view === 'ALL' && (
        <p className="text-sm text-foreground/70">
          아직 사진이 없습니다. 위에서 사진을 올려 보세요
        </p>
      )}
      {photos.isSuccess && view === 'ALL' && items.length > 0 && (
        <PhotoGrid photos={items} onSelect={select} />
      )}
      {photos.isSuccess && view === 'COMPARE' && (
        <BeforeAfterView groups={groups} onSelect={select} />
      )}
      {photos.hasNextPage && (
        <Button
          type="button"
          variant="secondary"
          disabled={photos.isFetchingNextPage}
          onClick={() => void photos.fetchNextPage()}
        >
          {photos.isFetchingNextPage ? '불러오는 중' : '더 보기'}
        </Button>
      )}
      {selected && (
        <PhotoDetailDialog
          photo={selected}
          onClose={() => setSelectedId(null)}
          onSave={async (photoId, body) => void (await update.mutateAsync({ id: photoId, body }))}
          onDelete={async (photoId) => remove.mutateAsync(photoId)}
        />
      )}
    </div>
  );
};
