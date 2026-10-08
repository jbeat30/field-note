import { Link } from 'react-router';

import { formatDay } from '../lib/dates';

import type { ResumableDraft } from './formDraft';

type ResumeDraftsProps = {
  drafts: readonly ResumableDraft[];
  // 프로젝트 이름을 찾는 표 (목록에 없으면 이름 없이 표시)
  projectNames: ReadonlyMap<string, string>;
};

const DRAFT_LABELS = { workLog: '일지', materials: '자재' } as const;

// 홈의 "이어서 작성": 저장하지 않고 닫았던 일지·자재 입력이 이 기기에 남아 있으면 바로 이어서 쓰도록 안내
export const ResumeDrafts = ({ drafts, projectNames }: ResumeDraftsProps) => {
  if (drafts.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-labelledby="resume-heading">
      <h2 id="resume-heading" className="text-lg font-bold">
        이어서 작성
      </h2>
      <p className="text-sm text-foreground/70">
        저장하지 않고 닫은 입력이 이 기기에 남아 있습니다
      </p>
      <ul className="flex flex-col gap-2">
        {drafts.map((draft) => (
          <li key={`${draft.projectId}:${draft.date}`}>
            <Link
              to={`/work-logs?project=${draft.projectId}&date=${draft.date}`}
              className="flex min-h-touch flex-col justify-center rounded-md border border-border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="font-medium">
                {projectNames.get(draft.projectId) ?? '프로젝트'} · {formatDay(draft.date)}{' '}
                {DRAFT_LABELS[draft.kind]} 작성 중
              </span>
              <span className="text-sm text-foreground/70">
                마지막 저장{' '}
                {new Date(draft.savedAt).toLocaleString('ko-KR', {
                  timeZone: 'Asia/Seoul',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
