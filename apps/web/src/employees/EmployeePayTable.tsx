import { PAY_TYPE_LABELS, type PayRate } from '@field-note/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Modal } from '../components/ui/modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/table';
import { formatWon } from '../labor/formatMoney';
import { PayRateForm } from '../labor/EmployeePayPanel';
import { usePayRateSummaries } from '../labor/useLabor';

import { useEmployees } from './useEmployees';
import { LoadingBlock } from '../components/ui/loading-block';

export const rateText = (rate: Pick<PayRate, 'payType' | 'amount'>) =>
  `${PAY_TYPE_LABELS[rate.payType]} ${formatWon(rate.amount)}`;

// 단가표 탭 (09): 직원별 현재 단가·적용 시작일·이전 단가를 한 표로 표시하고 `단가 변경` 직접 수행, 퇴사한 직원은 제외
export const EmployeePayTable = () => {
  const employees = useEmployees({});
  const summaries = usePayRateSummaries();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);

  if (employees.isError || summaries.isError) {
    return <Alert>단가표를 불러오지 못했습니다</Alert>;
  }

  if (!employees.data || !summaries.data) {
    return (
      <LoadingBlock
        label="단가표를 불러오는 중"
        variant="table"
        lines={6}
        className="relative -mt-14"
      />
    );
  }

  const byEmployee = new Map(summaries.data.map((item) => [item.employeeId, item]));
  const rows = employees.data.filter((employee) => employee.status !== 'LEFT');
  const missing = rows.filter((employee) => !byEmployee.get(employee.id)?.current).length;

  if (rows.length === 0) {
    return (
      <EmptyState
        title="재직 중인 직원이 없습니다"
        description="직원을 등록하면 단가를 넣을 수 있습니다"
      />
    );
  }

  return (
    <div className="relative -mt-14 flex flex-col gap-3 rounded-[30px] bg-surface-subtle p-5 sm:p-7">
      <h2 className="text-[19px] font-bold">단가표 {rows.length}명</h2>
      <p className="text-sm text-sub">
        프로젝트 인건비 추정에만 쓰입니다. 단가를 바꾸면 변경 기록으로 남고, 이전 날짜 근무분은 기존
        단가 그대로입니다
        {missing > 0 && `, 단가가 없는 직원 ${missing}명`}
      </p>
      <Table aria-label="직원 단가표" className="min-w-[44rem]">
        <TableHead>
          <TableRow>
            <TableHeaderCell>직원</TableHeaderCell>
            <TableHeaderCell>현재 단가</TableHeaderCell>
            <TableHeaderCell>적용 시작일</TableHeaderCell>
            <TableHeaderCell>이전 단가</TableHeaderCell>
            <TableHeaderCell className="relative">
              <span className="sr-only">단가 작업</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((employee) => {
            const summary = byEmployee.get(employee.id);

            return (
              <TableRow key={employee.id}>
                <TableCell>
                  <Link
                    className="font-semibold hover:text-sub"
                    to={`/employees/${employee.id}?tab=pay`}
                  >
                    {employee.name}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">
                  {summary?.current ? (
                    <>
                      <span className="font-semibold">{rateText(summary.current)}</span>
                      {summary.upcoming && (
                        <span className="block text-xs text-primary">
                          {summary.upcoming.effectiveFrom}부터 {rateText(summary.upcoming)}
                        </span>
                      )}
                    </>
                  ) : (
                    <Badge tone="warning">단가 없음</Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sub">
                  {summary?.current?.effectiveFrom ?? '-'}
                </TableCell>
                <TableCell className="text-sub tabular-nums">
                  {summary?.previous ? (
                    <>
                      {rateText(summary.previous)}
                      <span className="block text-xs">{summary.previous.effectiveFrom}부터</span>
                    </>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label={`${employee.name} 단가 변경`}
                    onClick={() => setTarget({ id: employee.id, name: employee.name })}
                  >
                    단가 변경
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Modal
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target ? `${target.name} 단가 변경` : '단가 변경'}
      >
        {target && <PayRateForm employeeId={target.id} onSaved={() => setTarget(null)} />}
      </Modal>
    </div>
  );
};
