import { useState, type FormEvent } from 'react';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

// 목록에 없을 때 그 자리에서 새로 추가 (현장에서 목록 관리 때문에 입력이 막히지 않게, 서비스 기획서 §11.2 취지)
// 추가한 항목은 호출한 쪽이 곧바로 선택해 준다
export const InlineAdd = ({
  label,
  placeholder,
  isPending,
  error,
  onAdd,
}: {
  label: string;
  placeholder: string;
  isPending: boolean;
  error: string;
  onAdd: (name: string) => Promise<boolean>;
}) => {
  const [isOpen, setOpen] = useState(false);
  const [name, setName] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (await onAdd(name)) {
      setName('');
      setOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="secondary"
        className="self-start"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
    );
  }

  // 바깥 폼 안에 들어가는 입력이라 별도 폼을 중첩하지 않고 Enter·버튼으로 직접 처리
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-2">
      <div className="flex gap-2">
        <Input
          aria-label={placeholder}
          placeholder={placeholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void submit(event);
            }
          }}
        />
        <Button
          type="button"
          className="shrink-0 whitespace-nowrap"
          disabled={isPending}
          onClick={(event) => void submit(event)}
        >
          추가
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 whitespace-nowrap"
          onClick={() => {
            setOpen(false);
            setName('');
          }}
        >
          취소
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
};
