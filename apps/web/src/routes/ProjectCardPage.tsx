import { PROJECT_STATUS_LABELS } from '@field-note/shared';
import { Link, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { ProjectAssignmentsPanel } from '../projects/ProjectAssignmentsPanel';
import { ProjectForm } from '../projects/ProjectForm';
import { ProjectPeriodHistory } from '../projects/ProjectPeriodHistory';
import { ProjectStatusPanel } from '../projects/ProjectStatusPanel';
import { useProject } from '../projects/useProjects';
import { ProjectWorkSummaryPanel } from '../workSummary/ProjectWorkSummaryPanel';

// 프로젝트 기본정보 화면. 투입·일지·집계 같은 탭은 이후 단계에서 붙는다
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

  return (
    <div className="flex flex-col gap-4">
      <Link className="min-h-touch content-center text-sm text-primary underline" to="/projects">
        ← 프로젝트 목록
      </Link>
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm text-foreground/70">
          {project.data.code}
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
            {PROJECT_STATUS_LABELS[project.data.status]}
          </span>
        </p>
        <h1 className="text-2xl font-bold">{project.data.name}</h1>
        {project.data.siteMapUrl && (
          <a
            className="min-h-touch content-center text-sm text-primary underline"
            href={project.data.siteMapUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            지도 열기
          </a>
        )}
      </div>
      <Link
        className="min-h-touch content-center text-primary underline"
        to={`/work-logs?project=${project.data.id}`}
      >
        일지 입력
      </Link>
      <Link
        className="min-h-touch content-center text-primary underline"
        to={`/projects/${project.data.id}/photos`}
      >
        사진첩
      </Link>
      <Link
        className="min-h-touch content-center text-primary underline"
        to={`/projects/${project.data.id}/memos`}
      >
        메모 노트
      </Link>
      <ProjectStatusPanel project={project.data} />
      <ProjectAssignmentsPanel project={project.data} />
      <ProjectWorkSummaryPanel projectId={project.data.id} />
      <section className="flex flex-col gap-3" aria-labelledby="info-heading">
        <h2 id="info-heading" className="text-lg font-bold">
          기본정보
        </h2>
        <ProjectForm project={project.data} />
      </section>
      <ProjectPeriodHistory projectId={project.data.id} />
    </div>
  );
};
