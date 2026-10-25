import { useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { StatGroup } from '../components/ui/stat-group';
import { ProjectSummarySheet } from '../completion/ProjectSummarySheet';
import { useProjectSummary } from '../completion/useCompletion';
import { useProject } from '../projects/useProjects';
import { LoadingBlock } from '../components/ui/loading-block';

// 프로젝트 요약 (완료 리포트): 현재 기록으로 한 장을 생성해 표시하고 인쇄·PDF 저장 또는 엑셀 내려받기
export const ProjectSummaryPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const summary = useProjectSummary(id);

  if (project.isPending || summary.isPending) {
    return (
      <LoadingBlock
        label="요약을 불러오는 중"
        variant="blocks"
        heights={[
          [226, 153],
          [1160, 1140],
        ]}
      />
    );
  }

  if (!project.data || !summary.data) {
    return <Alert>프로젝트 요약을 불러오지 못했습니다</Alert>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="print:hidden">
        <StatGroup
          items={[
            {
              label: '총 공수',
              value: (
                summary.data.work.totalMinutes / summary.data.settings.standardWorkMinutes
              ).toFixed(1),
              unit: 'MD',
              surface: 'cream',
            },
            {
              label: '변경·추가 작업',
              value: summary.data.changeWorks.items.length,
              unit: '건',
              surface: 'cream',
            },
            { label: '사진', value: summary.data.photos.total, unit: '장', surface: 'lime' },
          ]}
        />
      </div>
      <div className="rounded-[30px] bg-surface-subtle p-5 sm:p-7 print:rounded-none print:bg-transparent print:p-0">
        <ProjectSummarySheet summary={summary.data} />
      </div>
    </div>
  );
};
