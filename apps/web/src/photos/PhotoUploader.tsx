import { PHOTO_CATEGORIES, PHOTO_CATEGORY_LABELS, type PhotoCategory } from '@field-note/shared';
import { useRef, useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';

import type { EnqueueFailure, EnqueueSettings } from './enqueueFiles';

type PhotoUploaderProps = {
  // 고른 사진과 이번에 붙일 정보를 넘김. 대기열에 넣지 못한 사진은 사유와 함께 돌려줌
  onSelect: (files: File[], settings: EnqueueSettings) => Promise<EnqueueFailure[]>;
};

// 사진 올리기: 구분·구역을 먼저 정하고 사진을 여러 장 한꺼번에 고른다 (모바일은 카메라 또는 앨범)
export const PhotoUploader = ({ onSelect }: PhotoUploaderProps) => {
  const [category, setCategory] = useState<PhotoCategory>('DURING');
  const [area, setArea] = useState('');
  const [failures, setFailures] = useState<EnqueueFailure[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];

    // 같은 사진을 다시 골라도 변경 이벤트가 나도록 비움
    event.target.value = '';

    if (files.length === 0) return;

    setIsPreparing(true);
    setFailures(await onSelect(files, { category, area: area.trim() || undefined }));
    setIsPreparing(false);
  };

  return (
    <section
      className="flex flex-col gap-3 rounded-md border border-border p-3"
      aria-labelledby="upload-heading"
    >
      <h2 id="upload-heading" className="text-lg font-bold">
        사진 올리기
      </h2>
      <div className="grid grid-cols-2 gap-3">
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
        <FormField label="구역 (선택)">
          <Input
            value={area}
            maxLength={100}
            placeholder="예: 3층 301호"
            onChange={(event) => setArea(event.target.value)}
          />
        </FormField>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="사진 파일 선택"
        onChange={handleChange}
      />
      <Button type="button" disabled={isPreparing} onClick={() => inputRef.current?.click()}>
        {isPreparing ? '사진을 준비하는 중' : '사진 고르기·찍기'}
      </Button>
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
    </section>
  );
};
