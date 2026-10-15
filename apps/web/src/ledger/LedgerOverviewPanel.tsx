import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';

import { useLedgerSummary } from './useLedger';

const wonText = (amount: number) => amount.toLocaleString('ko-KR');

// 현황 화면의 지출·수입 합계 (08 문서 §6.2): 합계만 표시하고 내역은 비용·자재 메뉴에서 확인
export const LedgerOverviewPanel = ({ projectId }: { projectId: string }) => {
  const summary = useLedgerSummary(projectId);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="ledger-overview-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="ledger-overview-heading" className="text-lg font-bold">
          지출·수입
        </h2>
        <Link
          to={`/projects/${projectId}/materials`}
          className="inline-flex min-h-touch items-center text-sm text-primary underline"
        >
          내역 보기
        </Link>
      </div>
      {summary.isError && <Alert>지출·수입 합계를 불러오지 못했습니다</Alert>}
      {summary.data && (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-foreground/70">지출 합계</dt>
            <dd className="text-lg font-bold tabular-nums">
              {wonText(summary.data.expenseTotal)}원
            </dd>
          </div>
          <div>
            <dt className="text-foreground/70">수입 합계</dt>
            <dd className="text-lg font-bold tabular-nums">
              {wonText(summary.data.incomeTotal)}원
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
};
