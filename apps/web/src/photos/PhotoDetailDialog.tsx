import {
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABELS,
  type Photo,
  type PhotoCategory,
  type PhotoUpdate,
} from '@field-note/shared';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { getErrorDetailMessage } from '../lib/apiError';
import { formatDay } from '../lib/dates';

import { fetchPhotoOriginalUrl } from './usePhotos';

type PhotoDetailDialogProps = {
  photo: Photo;
  onClose: () => void;
  onSave: (id: string, body: PhotoUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  // 원본 주소를 받아 오는 함수 (스토리에서 교체)
  loadOriginalUrl?: (fileId: string) => Promise<string>;
};

// 사진 상세: 원본 보기, 구분·구역·설명 수정, 대표 지정, 삭제. 서버가 확인한 뒤에만 닫는다
export const PhotoDetailDialog = ({
  photo,
  onClose,
  onSave,
  onDelete,
  loadOriginalUrl = fetchPhotoOriginalUrl,
}: PhotoDetailDialogProps) => {
  const [category, setCategory] = useState<PhotoCategory>(photo.category);
  const [area, setArea] = useState(photo.area ?? '');
  const [description, setDescription] = useState(photo.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const original = useQuery({
    queryKey: ['photos', 'original', { fileId: photo.fileId }],
    queryFn: () => loadOriginalUrl(photo.fileId),
    enabled: photo.file.status === 'READY',
    // 주소 만료(5분)보다 짧게 캐시
    staleTime: 60_000,
  });

  const run = async (action: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);

    try {
      await action();
      onClose();
    } catch (caught) {
      setError(getErrorDetailMessage(caught));
      setIsBusy(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 top-0 mx-auto flex max-w-xl flex-col gap-3 overflow-y-auto bg-surface p-4 sm:inset-y-6 sm:rounded-md"
        >
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-lg font-bold">
              {PHOTO_CATEGORY_LABELS[photo.category]} · {formatDay(photo.workDate)}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button type="button" variant="secondary">
                닫기
              </Button>
            </Dialog.Close>
          </div>
          <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-md bg-muted">
            {original.data ? (
              <img
                src={original.data}
                alt={photo.description ?? '작업 사진'}
                className="max-h-[60vh] w-full object-contain"
              />
            ) : photo.thumbnailUrl ? (
              <img src={photo.thumbnailUrl} alt="" className="max-h-[60vh] w-full object-contain" />
            ) : (
              <p className="p-4 text-sm text-foreground/70">
                {photo.file.status === 'REJECTED'
                  ? '검사에서 거부된 사진입니다'
                  : '사진을 처리하는 중입니다'}
              </p>
            )}
          </div>
          <p className="text-sm text-foreground/70">
            촬영 {new Date(photo.takenAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
          </p>
          <FormField label="구분">
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value as PhotoCategory)}
            >
              {PHOTO_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {PHOTO_CATEGORY_LABELS[value]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="구역">
            <Input value={area} maxLength={100} onChange={(event) => setArea(event.target.value)} />
          </FormField>
          <FormField label="설명">
            <Textarea
              value={description}
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>
          {error && <Alert>{error}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={isBusy}
              onClick={() =>
                run(() =>
                  onSave(photo.id, {
                    category,
                    area: area.trim() || null,
                    description: description.trim() || null,
                  }),
                )
              }
            >
              저장
            </Button>
            {!photo.isCover && (
              <Button
                type="button"
                variant="secondary"
                disabled={isBusy}
                onClick={() => run(() => onSave(photo.id, { isCover: true }))}
              >
                대표 사진으로
              </Button>
            )}
            {isConfirmingDelete ? (
              <Button
                type="button"
                variant="danger"
                disabled={isBusy}
                onClick={() => run(() => onDelete(photo.id))}
              >
                정말 삭제
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={isBusy}
                onClick={() => setIsConfirmingDelete(true)}
              >
                삭제
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
