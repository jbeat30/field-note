import {
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABELS,
  SUMMARY_PHOTO_MAX,
  type Photo,
  type PhotoCategory,
  type PhotoUpdate,
} from '@field-note/shared';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/confirm-dialog';
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
  // 앞뒤 사진 넘기기 (없으면 버튼 숨김), 좌우 화살표 키 지원
  onPrev?: () => void;
  onNext?: () => void;
  // 원본 주소를 받아 오는 함수 (스토리에서 교체)
  loadOriginalUrl?: (fileId: string) => Promise<string>;
};

// 사진 상세: 원본 보기, 앞뒤 넘기기, 구분·구역·설명 수정, 대표 지정, 삭제, 서버 확인 후에만 닫기
export const PhotoDetailDialog = ({
  photo,
  onClose,
  onSave,
  onDelete,
  onPrev,
  onNext,
  loadOriginalUrl = fetchPhotoOriginalUrl,
}: PhotoDetailDialogProps) => {
  const [category, setCategory] = useState<PhotoCategory>(photo.category);
  const [area, setArea] = useState(photo.area ?? '');
  const [description, setDescription] = useState(photo.description ?? '');
  const [includeInSummary, setIncludeInSummary] = useState(photo.includeInSummary);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();
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
    <>
      {confirmDialog}
      <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-overlay" />
          <Dialog.Content
            aria-describedby={undefined}
            onKeyDown={(event) => {
              // 입력 칸에서 글자를 옮길 때는 넘기지 않음
              if (
                event.target instanceof HTMLElement &&
                event.target.closest('input, textarea, [role="combobox"]')
              )
                return;
              if (event.key === 'ArrowLeft' && onPrev) onPrev();
              if (event.key === 'ArrowRight' && onNext) onNext();
            }}
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
            <div className="relative flex min-h-40 items-center justify-center overflow-hidden rounded-md bg-muted">
              {original.data ? (
                <img
                  src={original.data}
                  alt={photo.description ?? '작업 사진'}
                  className="max-h-[60vh] w-full object-contain"
                />
              ) : photo.thumbnailUrl ? (
                <img
                  src={photo.thumbnailUrl}
                  alt=""
                  className="max-h-[60vh] w-full object-contain"
                />
              ) : (
                <p className="p-4 text-sm text-sub">
                  {photo.file.status === 'REJECTED'
                    ? '검사에서 거부된 사진입니다'
                    : '사진을 처리하는 중입니다'}
                </p>
              )}
              {onPrev && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  aria-label="이전 사진"
                  className="absolute top-1/2 left-2 -translate-y-1/2 shadow-card"
                  onClick={onPrev}
                >
                  <ChevronLeft aria-hidden />
                </Button>
              )}
              {onNext && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  aria-label="다음 사진"
                  className="absolute top-1/2 right-2 -translate-y-1/2 shadow-card"
                  onClick={onNext}
                >
                  <ChevronRight aria-hidden />
                </Button>
              )}
            </div>
            <p className="text-sm text-sub">
              촬영 {new Date(photo.takenAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
            </p>
            <FormField label="구분">
              <Select
                value={category}
                onValueChange={setCategory}
                options={PHOTO_CATEGORIES.map((value) => ({
                  value,
                  label: PHOTO_CATEGORY_LABELS[value],
                }))}
              />
            </FormField>
            <FormField label="구역">
              <Input
                placeholder="예: 2층 복도"
                value={area}
                maxLength={100}
                onChange={(event) => setArea(event.target.value)}
              />
            </FormField>
            <FormField label="설명">
              <Textarea
                placeholder="사진 설명을 입력하세요"
                value={description}
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
              />
            </FormField>
            <label className="flex min-h-touch items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0"
                checked={includeInSummary}
                onChange={(event) => setIncludeInSummary(event.target.checked)}
              />
              <span>
                준공 요약에 넣기
                <span className="block text-sub">
                  고객에게 내는 준공 요약에 이 사진을 싣습니다 (프로젝트마다 {SUMMARY_PHOTO_MAX}
                  장까지, 하나도 고르지 않으면 작업 후 사진 최근 8장)
                </span>
              </span>
            </label>
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
                      includeInSummary,
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
              <Button
                type="button"
                variant="secondary"
                disabled={isBusy}
                onClick={async () => {
                  const ok = await confirm({
                    title: '사진을 지울까요?',
                    description: '지우면 되돌릴 수 없습니다',
                    confirmLabel: '지우기',
                    danger: true,
                  });
                  if (ok) void run(() => onDelete(photo.id));
                }}
              >
                삭제
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};
