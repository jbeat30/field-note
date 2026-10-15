import { useState } from 'react';
import { useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { ProjectSummarySheet } from '../completion/ProjectSummarySheet';
import { useProjectSummary } from '../completion/useCompletion';
import { useProject } from '../projects/useProjects';
import { downloadSummaryXlsx } from '../reports/exportReport';

// 프로젝트 요약 (완료 리포트, 서비스 기획서 §10.7): 지금 기록으로 한 장을 만들어 보여 주고 인쇄·PDF로 저장하거나 엑셀로 내려받는다
export const ProjectSummaryPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const summary = useProjectSummary(id);
  const [isExporting, setExporting] = useState(false);
  const [exported, setExported] = useState('');
  const [exportError, setExportError] = useState('');

  if (project.isPending || summary.isPending) {
    return <p className="text-sm">요약을 불러오는 중</p>;
  }

  if (!project.data || !summary.data) {
    return <Alert>프로젝트 요약을 불러오지 못했습니다</Alert>;
  }

  const exportXlsx = async () => {
    setExporting(true);
    setExported('');
    setExportError('');

    try {
      setExported(await downloadSummaryXlsx(id));
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '내려받지 못했습니다');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        {exportError && <Alert>{exportError}</Alert>}
        {exported && <Alert variant="info">{exported} 파일을 내려받았습니다</Alert>}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isExporting}
          onClick={() => void exportXlsx()}
        >
          {isExporting ? '내려받는 중' : '엑셀 내려받기'}
        </Button>
      </div>
      <ProjectSummarySheet summary={summary.data} />
    </div>
  );
};
