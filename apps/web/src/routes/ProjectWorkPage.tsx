import {
  WORK_LOG_STATUS_LABELS,
  checkWorkDate,
  roundTo,
  todayInSeoul,
  type WorkLogSummary,
} from '@field-note/shared';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { columnHelper, DataTable } from '../components/ui/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { PageHeader } from '../components/ui/page-header';
import { StatGroup } from '../components/ui/stat-group';
import { useEmployees } from '../employees/useEmployees';
import { PeriodNav } from '../components/ui/period-nav';
import { formatDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';
import { useProject } from '../projects/useProjects';
import { ProjectWorkCalendar } from '../workLogs/ProjectWorkCalendar';
import { useWorkLogList } from '../workLogs/useWorkLogs';

const helper = columnHelper<WorkLogSummary>();

const hoursOf = (minutes: number) => `${roundTo(minutes / 60, 1)}시간`;

// 열 머리를 누르면 정렬 (처음 표시 순서는 최근 날짜 먼저), 날짜 링크가 이 프로젝트의 날짜 화면으로 가도록 프로젝트별로 생성
const buildColumns = (projectId: string) =>
  helper.columns([
    helper.accessor('workDate', {
      id: 'workDate',
      header: '날짜',
      sortFn: 'text',
      cell: ({ row }) => (
        <Link
          className="font-semibold hover:text-sub"
          to={projectWorkPath(projectId, row.original.workDate)}
          onClick={(event) => event.stopPropagation()}
        >
          {formatDay(row.original.workDate)}
        </Link>
      ),
    }),
    helper.accessor((row) => WORK_LOG_STATUS_LABELS[row.status], {
      id: 'status',
      header: '상태',
      sortFn: 'text',
      cell: ({ row }) => (
        <Badge tone={row.original.status === 'SAVED' ? 'success' : 'warning'}>
          {WORK_LOG_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    }),
    helper.accessor('totalMinutes', {
      id: 'minutes',
      header: '일한 시간 합계',
      sortFn: 'basic',
      // 처음 누르면 오름차순
      sortDescFirst: false,
      cell: ({ getValue }) => hoursOf(getValue()),
    }),
    helper.accessor('entryCount', {
      id: 'entries',
      header: '기록한 항목',
      sortFn: 'basic',
      // 처음 누르면 오름차순
      sortDescFirst: false,
      meta: { className: 'hidden md:table-cell' },
      cell: ({ getValue }) => `${getValue()}건`,
    }),
    helper.display({
      id: 'flags',
      header: '표시',
      meta: { className: 'hidden md:table-cell' },
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex flex-wrap gap-1">
          {!row.original.hasContent && <Badge>한 일 안 적음</Badge>}
          {row.original.isLate && <Badge tone="warning">늦게 입력</Badge>}
          {row.original.isChange && <Badge tone="primary">추가 공사</Badge>}
          {row.original.isAfterService && <Badge tone="primary">사후 작업</Badge>}
        </span>
      ),
    }),
  ]);

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// 달(YYYY-MM-01)을 한 달 옮김
const shiftMonth = (month: string, delta: number) => {
  const base = new Date(`${month}T00:00:00Z`);

  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + delta, 1))
    .toISOString()
    .slice(0, 10);
};

// 프로젝트의 작업 달력: 날짜를 눌러 그날 누가(회사 직원 중에서) 몇 시간 무슨 일을 했는지 입력, 아래 표는 기록한 날 목록
export const ProjectWorkPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const project = useProject(id);
  const logs = useWorkLogList(id);
  const employees = useEmployees({});
  const today = todayInSeoul(new Date());
  const requested = params.get('month');
  // 처음에는 오늘이 속한 달 (프로젝트 기간 밖이면 시작일이 속한 달)
  const fallback =
    project.data && (today < project.data.plannedStart || today > project.data.plannedEnd)
      ? project.data.plannedStart
      : today;
  const month =
    requested && MONTH_PATTERN.test(requested) ? `${requested}-01` : `${fallback.slice(0, 7)}-01`;
  const moveMonth = (delta: number) =>
    setParams({ month: shiftMonth(month, delta).slice(0, 7) }, { replace: true });

  const projectColumns = useMemo(() => buildColumns(id), [id]);
  const rows = useMemo(
    () => [...(logs.data ?? [])].sort((a, b) => b.workDate.localeCompare(a.workDate)),
    [logs.data],
  );
  const names = new Map((employees.data ?? []).map((item) => [item.id, item.name]));
  const todayLog = rows.find((item) => item.workDate === today);
  // 보고 있는 달의 기록한 날 수와 일한 시간
  const monthRows = rows.filter((item) => item.workDate.startsWith(month.slice(0, 7)));
  const monthMinutes = monthRows.reduce(
    (sum, item) => sum + item.workers.reduce((inner, worker) => inner + worker.minutes, 0),
    0,
  );
  const todayCheck = project.data
    ? checkWorkDate(today, project.data, today)
    : { ok: false as const, message: '' };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        level={2}
        title="작업 달력"
        description="날짜를 눌러 그날 일한 직원과 시간, 한 일을 기록합니다. 날마다 나온 사람이 달라도 됩니다"
        actions={
          todayCheck.ok ? (
            <Button asChild>
              <Link to={projectWorkPath(id, today)}>
                <Plus aria-hidden className="size-5" />
                {todayLog ? '오늘 작업 고치기' : '오늘 작업 입력'}
              </Link>
            </Button>
          ) : undefined
        }
      />

      {project.data && !todayCheck.ok && (
        <Alert variant="info">
          오늘은 작업을 입력할 수 없습니다. {'message' in todayCheck ? todayCheck.message : ''}
        </Alert>
      )}

      {logs.isError && <Alert>작업 내역을 불러오지 못했습니다</Alert>}

      <StatGroup
        items={[
          { label: '이번 달 기록한 날', value: monthRows.length, unit: '일', surface: 'cream' },
          {
            label: '이번 달 일한 시간',
            value: roundTo(monthMinutes / 60, 1),
            unit: '시간',
            surface: 'lime',
          },
          {
            label: '오늘',
            value: todayLog ? '기록함' : '기록 없음',
            surface: 'accent',
          },
        ]}
      />

      <section className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4 sm:p-5">
        <PeriodNav
          label={`${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`}
          prevLabel="이전 달"
          nextLabel="다음 달"
          onPrev={() => moveMonth(-1)}
          onNext={() => moveMonth(1)}
          todayLabel="이번 달"
          onToday={() => setParams({}, { replace: true })}
        />
        {project.data && (
          <ProjectWorkCalendar
            projectId={id}
            month={month}
            today={today}
            plannedStart={project.data.plannedStart}
            plannedEnd={project.data.plannedEnd}
            logs={logs.data ?? []}
            nameOf={(employeeId) => names.get(employeeId) ?? '직원'}
          />
        )}
        <p className="text-xs text-sub">
          흐린 칸은 프로젝트 기간({project.data?.plannedStart} ~ {project.data?.plannedEnd})
          밖이거나 아직 오지 않은 날이라 입력할 수 없습니다
        </p>
      </section>

      {logs.isPending && <p className="text-sm">작업 내역을 불러오는 중</p>}
      {logs.data && (
        <section className="flex flex-col gap-2" aria-labelledby="logged-days-heading">
          <h2 id="logged-days-heading" className="text-lg font-bold">
            기록한 날
          </h2>
          <DataTable
            aria-label="날짜별 작업 내역"
            columns={projectColumns}
            data={rows}
            getRowId={(row) => row.id}
            onRowClick={(row) => void navigate(projectWorkPath(id, row.workDate))}
            summary={`${rows.length}일 기록`}
            emptyState={
              <EmptyState
                title="아직 작업 내역이 없습니다"
                description="달력에서 날짜를 눌러 첫 기록을 남겨 보세요"
              />
            }
          />
        </section>
      )}
    </div>
  );
};
