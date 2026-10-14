import { Camera } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { formatLongDay } from '../lib/dates';
import { enqueueFiles, type EnqueueFailure } from '../photos/enqueueFiles';
import { PhotoDetailDialog } from '../photos/PhotoDetailDialog';
import { PhotoGrid } from '../photos/PhotoGrid';
import { getPhotoUploadQueue, usePhotoUploadItems } from '../photos/photoUploadQueue';
import { UploadQueuePanel } from '../photos/UploadQueuePanel';
import { useDeletePhoto, usePhotoList, useUpdatePhoto } from '../photos/usePhotos';

import { WorkStep } from './WorkStep';

type DayPhotosStepProps = {
  projectId: string;
  date: string;
};

// 하루 기록의 작업 사진: 이 날 작업일로 바로 올리고(구분은 "작업 중"), 구분·구역은 사진을 눌러 사진마다 고친다
export const DayPhotosStep = ({ projectId, date }: DayPhotosStepProps) => {
  const photos = usePhotoList(projectId, { workDate: date }, 12);
  const queue = getPhotoUploadQueue();
  const queueItems = usePhotoUploadItems().filter((item) => item.projectId === projectId);
  const update = useUpdatePhoto();
  const remove = useDeletePhoto();
  const [failures, setFailures] = useState<EnqueueFailure[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = photos.data?.pages.flatMap((page) => page.items) ?? [];
  const selected = items.find((photo) => photo.id === selectedId) ?? null;

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];

    event.target.value = '';
    if (files.length === 0) return;

    setIsPreparing(true);
    setFailures(
      await enqueueFiles(queue, projectId, files, { category: 'DURING', workDate: date }),
    );
    setIsPreparing(false);
  };

  return (
    <WorkStep
      number={5}
      title={`${formatLongDay(date)} 작업 사진`}
      description="올리면 바로 저장됩니다. 구분·구역은 사진을 눌러 고치세요"
      aside={
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            aria-label="사진 파일 선택"
            onChange={(event) => void handleChange(event)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isPreparing}
            onClick={() => inputRef.current?.click()}
          >
            <Camera aria-hidden />
            {isPreparing ? '준비 중' : '사진 올리기'}
          </Button>
        </div>
      }
    >
      {failures.length > 0 && (
        <Alert>
          <ul>
            {failures.map((failure) => (
              <li key={failure.name}>
                {failure.name}: {failure.message}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      <UploadQueuePanel
        items={queueItems}
        onRetry={(itemId) => void queue.retry(itemId)}
        onCancel={(itemId) => void queue.cancel(itemId)}
        onClearDone={queue.clearDone}
      />
      {photos.isPending ? (
        <p className="text-sm text-foreground/70">불러오는 중</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-foreground/70">이 날 올린 사진이 없습니다</p>
      ) : (
        <PhotoGrid photos={items} onSelect={(photo) => setSelectedId(photo.id)} />
      )}
      {photos.hasNextPage && (
        <Link
          className="self-start text-sm font-medium text-primary underline"
          to={`/projects/${projectId}/photos`}
        >
          사진첩에서 모두 보기
        </Link>
      )}
      {selected && (
        <PhotoDetailDialog
          photo={selected}
          onClose={() => setSelectedId(null)}
          onSave={async (photoId, body) => void (await update.mutateAsync({ id: photoId, body }))}
          onDelete={async (photoId) => remove.mutateAsync(photoId)}
        />
      )}
    </WorkStep>
  );
};
