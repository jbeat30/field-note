import { todayInSeoul } from '@field-note/shared';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { addDays, formatDay } from '../lib/dates';
import { useProject } from '../projects/useProjects';
import { downloadReportXlsx, printWhenReady } from '../reports/exportReport';
import { ReportSheet } from '../reports/ReportSheet';
import { useDailyReport } from '../reports/useDailyReport';

// 작업일보 출력: 하루치를 화면에서 확인하고 인쇄·PDF로 저장하거나, 기간을 정해 엑셀로 내려받는다 (서비스 기획서 §15.4)
export const DailyReportPage = () => {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const today = todayInSeoul(new Date());
  const date = params.get('date') || today;
  const project = useProject(id);
  const report = useDailyReport(id, date);
  const [from, setFrom] = useState(`${date.slice(0, 7)}-01`);
  const [to, setTo] = useState(date);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);

  const setDate = (next: string) => {
    const nextParams = new URLSearchParams(params);

    nextParams.set('date', next);
    setParams(nextParams, { replace: true });
  };

  const exportXlsx = async () => {
    setIsExporting(true);
    setExportError(null);
    setExported(null);

    try {
      setExported(await downloadReportXlsx(id, from, to));
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : '내보내지 못했습니다');
    } finally {
      setIsExporting(false);
      // 성공이든 실패든 확인 창은 닫고, 결과(내려받음 또는 오류)는 화면에서 알림
      setIsConfirming(false);
    }
  };

  if (project.isPending) {
    return <p className="text-sm">프로젝트를 불러오는 중</p>;
  }

  if (!project.data) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 print:hidden">
        <Link
          className="min-h-touch content-center text-sm text-primary underline"
          to={`/projects/${id}`}
        >
          ← {project.data.name}
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            aria-label="전날"
            onClick={() => setDate(addDays(date, -1))}
          >
            ◀
          </Button>
          <Input
            type="date"
            aria-label="일보 날짜"
            value={date}
            onChange={(event) => event.target.value && setDate(event.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            aria-label="다음 날"
            onClick={() => setDate(addDays(date, 1))}
          >
            ▶
          </Button>
        </div>
        <Button type="button" disabled={!report.data} onClick={() => void printWhenReady()}>
          인쇄·PDF로 저장
        </Button>
        <p className="text-sm text-foreground/70">
          인쇄 창에서 “PDF로 저장”을 고르면 {formatDay(date)} 작업일보를 파일로 보관·제출할 수
          있습니다
        </p>
        <details className="rounded-md border border-border p-3">
          <summary className="min-h-touch cursor-pointer content-center text-base font-medium">
            엑셀로 내보내기
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="시작일">
                <Input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </FormField>
              <FormField label="끝일">
                <Input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(event) => setTo(event.target.value)}
                />
              </FormField>
            </div>
            {exportError && <Alert>{exportError}</Alert>}
            {exported && <Alert variant="info">{exported} 파일을 내려받았습니다</Alert>}
            <Button
              type="button"
              variant="secondary"
              disabled={!from || !to}
              onClick={() => setIsConfirming(true)}
            >
              엑셀 내려받기
            </Button>
          </div>
        </details>
      </div>

      {report.isPending && <p className="text-sm print:hidden">작업일보를 불러오는 중</p>}
      {report.isError && <Alert>작업일보를 불러오지 못했습니다</Alert>}
      {report.data && <ReportSheet report={report.data} />}

      <Dialog.Root open={isConfirming} onOpenChange={setIsConfirming}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-foreground/50 print:hidden" />
          <Dialog.Content
            aria-describedby="export-description"
            className="fixed inset-x-0 bottom-0 mx-auto flex max-w-xl flex-col gap-3 rounded-t-lg bg-surface p-4 print:hidden"
          >
            <Dialog.Title className="text-lg font-bold">엑셀로 내보낼까요?</Dialog.Title>
            <p id="export-description" className="text-base">
              {from} ~ {to}의 일지·공수·자재를 엑셀로 내려받습니다. 내보낸 사람과 기간은 기록으로
              남습니다.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1"
                disabled={isExporting}
                onClick={() => void exportXlsx()}
              >
                {isExporting ? '내보내는 중' : '기록을 남기고 내려받기'}
              </Button>
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  취소
                </Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
