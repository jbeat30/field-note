import { Alert } from '../components/ui/alert';
import { formatLongDay } from '../lib/dates';
import { memoDraftKey } from '../memos/memoDraft';
import { MemoForm } from '../memos/MemoForm';
import { MemoList } from '../memos/MemoList';
import { useCreateMemo, useDeleteMemo, useMemoList, useUpdateMemo } from '../memos/useMemos';

import { WorkStep } from './WorkStep';

type DayMemosStepProps = {
  projectId: string;
  date: string;
};

// 하루 기록의 메모: 통화·지시·이슈·할 일을 이 날짜로 남긴다 (모아 보기는 메모 탭)
export const DayMemosStep = ({ projectId, date }: DayMemosStepProps) => {
  const memos = useMemoList({ scope: 'PROJECT', projectId }, { memoDate: date });
  const create = useCreateMemo();
  const update = useUpdateMemo();
  const remove = useDeleteMemo();
  const items = memos.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <WorkStep
      number={6}
      title={`${formatLongDay(date)} 메모`}
      description="통화·지시·이슈·할 일을 적어 두세요. 저장하면 바로 남습니다"
    >
      <MemoForm
        draftKey={`${memoDraftKey(projectId)}:${date}`}
        submitLabel="메모 저장"
        onSubmit={async (value) =>
          void (await create.mutateAsync({ ...value, projectId, memoDate: date }))
        }
      />
      {(update.error ?? remove.error) && (
        <Alert>처리하지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>
      )}
      {memos.isError && <Alert>메모를 불러오지 못했습니다</Alert>}
      {items.length > 0 && (
        <MemoList
          memos={items}
          onToggleDone={(memo, isDone) => update.mutate({ id: memo.id, body: { isDone } })}
          onEdit={(memo, content, tag) => update.mutate({ id: memo.id, body: { content, tag } })}
          onDelete={(memo) => remove.mutate(memo.id)}
        />
      )}
    </WorkStep>
  );
};
