import { PROJECT_STATUS_LABELS } from '@field-note/shared';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { BackLink } from '../components/ui/back-link';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/ui/page-header';
import { PinnedDocuments } from '../documents/PinnedDocuments';
import { RequiredCredentialsPanel } from '../credentials/RequiredCredentialsPanel';
import { ProjectAssignmentsPanel } from '../projects/ProjectAssignmentsPanel';
import { ProjectForm } from '../projects/ProjectForm';
import { ProjectPeriodHistory } from '../projects/ProjectPeriodHistory';
import { ProjectLaborCostPanel } from '../labor/ProjectLaborCostPanel';
import { ProjectProgressPanel } from '../progress/ProjectProgressPanel';
import { ProjectStatusPanel } from '../projects/ProjectStatusPanel';
import { useProject } from '../projects/useProjects';
import { ProjectWorkSummaryPanel } from '../workSummary/ProjectWorkSummaryPanel';

// 프로젝트 기본정보 화면. 투입·일지·집계 같은 탭은 이후 단계에서 붙는다
// 보증 화면은 완료 이후 상태에서만 보인다 (종료는 조회만)
const WARRANTY_PAGE_STATUSES: readonly string[] = ['COMPLETED', 'WARRANTY', 'CLOSED'];

export const ProjectCardPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);

  if (project.isPending) {
    return <p className="text-sm">프로젝트를 불러오는 중</p>;
  }

  if (project.isError) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  if (!project.data) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">프로젝트를 찾을 수 없습니다</h1>
        <Link className="min-h-touch content-center text-primary underline" to="/projects">
          프로젝트 목록으로
        </Link>
      </div>
    );
  }

  const { data } = project;
  const links: { to: string; label: string; show?: boolean }[] = [
    { to: `/projects/${data.id}/photos`, label: '사진첩' },
    { to: `/projects/${data.id}/memos`, label: '메모 노트' },
    { to: `/projects/${data.id}/materials`, label: '자재 현황' },
    { to: `/projects/${data.id}/documents`, label: '문서함' },
    { to: `/projects/${data.id}/daily-report`, label: '작업일보 출력' },
    { to: `/projects/${data.id}/change-works`, label: '변경·추가 작업' },
    { to: `/projects/${data.id}/summary`, label: '프로젝트 요약' },
    {
      to: `/projects/${data.id}/repairs`,
      label: '보수 요청',
      show: WARRANTY_PAGE_STATUSES.includes(data.status),
    },
    {
      to: `/projects/${data.id}/warranty`,
      label: '보증',
      show: WARRANTY_PAGE_STATUSES.includes(data.status),
    },
    { to: `/search?project=${data.id}`, label: '프로젝트 안에서 찾기' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/projects">프로젝트 목록</BackLink>
      <PageHeader
        eyebrow={
          <>
            {data.code}
            <Badge tone="primary">{PROJECT_STATUS_LABELS[data.status]}</Badge>
            {data.siteMapUrl && (
              <a
                className="text-primary underline"
                href={data.siteMapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                지도 열기
              </a>
            )}
          </>
        }
        title={data.name}
        actions={
          <Button asChild>
            <Link to={`/work-logs?project=${data.id}`}>일지 입력</Link>
          </Button>
        }
      />
      <nav
        aria-label="프로젝트 바로가기"
        className="flex flex-wrap gap-2 rounded-xl bg-surface-subtle p-3"
      >
        {links
          .filter((link) => link.show !== false)
          .map((link) => (
            <Link
              key={link.to}
              className="inline-flex min-h-touch items-center rounded-full bg-surface-nested px-4 text-sm font-medium text-foreground hover:bg-primary-subtle hover:text-primary"
              to={link.to}
            >
              {link.label}
            </Link>
          ))}
      </nav>
      <PinnedDocuments projectId={data.id} />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Panel>
            <ProjectStatusPanel project={data} />
          </Panel>
          <Panel>
            <ProjectAssignmentsPanel project={data} />
          </Panel>
          <Panel>
            <RequiredCredentialsPanel projectId={data.id} />
          </Panel>
        </div>
        <div className="flex flex-col gap-5">
          <Panel>
            <ProjectProgressPanel projectId={data.id} status={data.status} />
          </Panel>
          <Panel>
            <ProjectWorkSummaryPanel projectId={data.id} />
          </Panel>
          <Panel>
            <ProjectLaborCostPanel projectId={data.id} />
          </Panel>
        </div>
      </div>
      <Panel>
        <section className="flex flex-col gap-4" aria-labelledby="info-heading">
          <h2 id="info-heading" className="text-lg font-bold">
            기본정보
          </h2>
          <ProjectForm project={data} />
        </section>
      </Panel>
      <Panel>
        <ProjectPeriodHistory projectId={data.id} />
      </Panel>
    </div>
  );
};

// 패널 하나를 카드로 감쌈 (패널 안의 상자는 자동으로 한 단계 어두운 면이 됨)
const Panel = ({ children }: { children: ReactNode }) => (
  <div className="rounded-xl bg-surface-subtle p-5">{children}</div>
);
