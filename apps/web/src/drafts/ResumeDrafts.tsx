import { Link } from 'react-router';

import { projectWorkPath } from '../lib/projectPaths';

import { formatDay } from '../lib/dates';

import type { ResumableDraft } from './formDraft';

type ResumeDraftsProps = {
  drafts: readonly ResumableDraft[];
  // 프로젝트 이름을 찾는 표 (목록에 없으면 이름 없이 표시)
  projectNames: ReadonlyMap<string, string>;
};

const DRAFT_LABELS = { workLog: '작업 내역', materials: '자재' } as const;

// 홈의 "이어서 작성": 저장하지 않고 닫았던 작업 내역·자재 입력이 이 기기에 남아 있으면 바로 이어서 쓰도록 안내
export const ResumeDrafts = ({ drafts, projectNames }: ResumeDraftsProps) => {
  if (drafts.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-2 rounded-[34px] bg-surface-subtle px-7 py-6"
      aria-labelledby="resume-heading"
    >
      <h2 id="resume-heading" className="text-[21px] font-bold tracking-[-0.025em]">
        이어서 작성
      </h2>
      <p className="text-sm text-sub">저장하지 않고 닫은 입력이 이 기기에 남아 있습니다</p>
      <ul className="flex flex-col gap-2">
        {drafts.map((draft) => (
          <li key={`${draft.projectId}:${draft.date}`}>
            <Link
              to={projectWorkPath(draft.projectId, draft.date)}
              className="flex min-h-touch flex-col justify-center rounded-2xl bg-surface-nested px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              <span className="font-bold">
                {projectNames.get(draft.projectId) ?? '프로젝트'} · {formatDay(draft.date)}{' '}
                {DRAFT_LABELS[draft.kind]} 작성 중
              </span>
              <span className="text-sm text-sub">
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
