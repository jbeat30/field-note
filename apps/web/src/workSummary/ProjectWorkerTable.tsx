import { roundTo } from '@field-note/shared';

import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/table';
import { useEmployees } from '../employees/useEmployees';
import { useAssignments } from '../projects/useAssignments';

import { useWorkSummary } from './useWorkSummary';

// 프로젝트 전체 기간 동안 누가 며칠, 몇 시간 일했는지 한눈에 보는 표 (저장된 작업 내역 기준, 팀이 아닌 직원도 포함)
export const ProjectWorkerTable = ({ projectId }: { projectId: string }) => {
  const summary = useWorkSummary(projectId, { unit: 'week' });
  const assignments = useAssignments(projectId);
  const employees = useEmployees({});

  if (summary.isError) return <Alert>일한 사람 정리를 불러오지 못했습니다</Alert>;
  if (!summary.data) return <p className="text-sm">불러오는 중</p>;

  const names = new Map((employees.data ?? []).map((item) => [item.id, item]));
  const teamIds = new Set(
    (assignments.data ?? []).filter((item) => !item.cancelledAt).map((item) => item.employeeId),
  );
  const rows = summary.data.byEmployee.filter((row) => row.totalMinutes > 0);
  const total = rows.reduce((sum, row) => sum + row.totalMinutes, 0);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="worker-table-heading">
      <div className="flex flex-col gap-1">
        <h2 id="worker-table-heading" className="text-lg font-bold">
          일한 사람 정리
        </h2>
        <p className="text-sm text-foreground/70">
          프로젝트 시작부터 지금까지 날마다 기록한 내역을 사람별로 모았습니다
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-foreground/70">아직 기록된 작업이 없습니다</p>
      ) : (
        <Table aria-label="일한 사람 정리">
          <TableHead>
            <TableRow>
              <TableHeaderCell>이름</TableHeaderCell>
              <TableHeaderCell className="text-right">일한 날</TableHeaderCell>
              <TableHeaderCell className="text-right">총 시간</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const employee = names.get(row.employeeId);

              return (
                <TableRow key={row.employeeId}>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{employee?.name ?? '직원'}</span>
                      {employee?.title && (
                        <span className="text-foreground/70">{employee.title}</span>
                      )}
                      {!teamIds.has(row.employeeId) && <Badge>팀 밖</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{row.workedDays}일</TableCell>
                  <TableCell className="text-right font-semibold">
                    {roundTo(row.totalMinutes / 60, 1)}시간
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell className="font-bold">합계 {rows.length}명</TableCell>
              <TableCell className="text-right">{summary.data.workedDays}일</TableCell>
              <TableCell className="text-right font-bold">{roundTo(total / 60, 1)}시간</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </section>
  );
};
