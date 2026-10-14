import { useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { ProjectSummarySheet } from '../completion/ProjectSummarySheet';
import { useProjectSummary } from '../completion/useCompletion';
import { useProject } from '../projects/useProjects';

// 프로젝트 요약 (완료 리포트, 서비스 기획서 §10.7): 지금 기록으로 한 장을 만들어 보여 주고 인쇄·PDF로 저장한다
export const ProjectSummaryPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const summary = useProjectSummary(id);

  if (project.isPending || summary.isPending) {
    return <p className="text-sm">요약을 불러오는 중</p>;
  }

  if (!project.data || !summary.data) {
    return <Alert>프로젝트 요약을 불러오지 못했습니다</Alert>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ProjectSummarySheet summary={summary.data} />
    </div>
  );
};
