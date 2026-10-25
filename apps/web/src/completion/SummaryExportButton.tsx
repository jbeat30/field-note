import { useState } from 'react';

import { Button } from '../components/ui/button';
import { downloadSummaryXlsx } from '../reports/exportReport';
import { toast } from '../stores/toastStore';

// 마감 요약 엑셀 내려받기 버튼, 결과는 잠깐 보였다 사라지는 안내로 알림
export const SummaryExportButton = ({ projectId }: { projectId: string }) => {
  const [isExporting, setExporting] = useState(false);

  const exportXlsx = async () => {
    setExporting(true);

    try {
      toast(`${await downloadSummaryXlsx(projectId)} 파일을 내려받았습니다`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '내려받지 못했습니다', 'danger');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={isExporting}
      onClick={() => void exportXlsx()}
    >
      {isExporting ? '내려받는 중' : '엑셀 내려받기'}
    </Button>
  );
};
