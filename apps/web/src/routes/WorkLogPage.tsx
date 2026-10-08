import {
  PROJECT_STATUS_LABELS,
  WORK_LOG_STATUS_LABELS,
  minutesToHours,
  roundTo,
  todayInSeoul,
} from '@field-note/shared';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { useEmployees } from '../employees/useEmployees';
import { addDays, formatDay } from '../lib/dates';
import { useAssignments } from '../projects/useAssignments';
import { useProject, useProjects } from '../projects/useProjects';
import { useCompanySettings } from '../settings/useCompanySettings';
import { useOptions } from '../settings/useOptions';
import { useDraftHydrated } from '../drafts/useLocalDraft';
import { MaterialDayPanel } from '../materials/MaterialDayPanel';
import { WorkLogEditor } from '../workLogs/WorkLogEditor';
import { useWorkLog, useWorkLogList } from '../workLogs/useWorkLogs';

const WRITABLE = ['IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'WARRANTY'];

// 작업일지 입력 화면: 프로젝트와 날짜를 고르고 직원별 공수를 한 번에 입력한다
export const WorkLogPage = () => {
  const [params, setParams] = useSearchParams();
  const today = todayInSeoul(new Date());
  const date = params.get('date') || today;
  const projects = useProjects({});
  const projectId =
    params.get('project') || projects.data?.find((item) => item.status === 'IN_PROGRESS')?.id || '';
  const project = useProject(projectId);
  const settings = useCompanySettings();
  const options = useOptions();
  const employees = useEmployees({});
  const assignments = useAssignments(projectId);
  const log = useWorkLog(projectId, date);
  const list = useWorkLogList(projectId);
  // 저장·불러오기 뒤 편집 상태를 새로 만들기 위한 값
  const [reloadToken, setReloadToken] = useState(0);
  // 기기에 저장된 초안을 읽어 온 뒤에 폼을 그려야 복구할 수 있음
  const isDraftReady = useDraftHydrated();

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);

    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }

    setParams(next, { replace: true });
  };

  const loading = [project, settings, options, employees, assignments, log].some(
    (query) => query.isPending && query.fetchStatus !== 'idle',
  );
  const failed = [projects, settings, options, employees].some((query) => query.isError);
  const categories = (options.data ?? []).filter((item) => item.kind === 'WORK_CATEGORY');
  const assignedIds = [
    ...new Set(
      (assignments.data ?? [])
        .filter((item) => !item.cancelledAt && item.startDate <= date && date <= item.endDate)
        .map((item) => item.employeeId),
    ),
  ];
  const previousDate =
    (list.data ?? [])
      .map((item) => item.workDate)
      .filter((workDate) => workDate < date)
      .sort()
      .at(-1) ?? null;

  const problem = (() => {
    const found = project.data;

    if (!found) return '';
    if (found.status === 'PLANNED')
      return '아직 시작하지 않은 프로젝트입니다. 먼저 작업을 시작해 주세요';
    if (!WRITABLE.includes(found.status))
      return `${PROJECT_STATUS_LABELS[found.status]} 상태의 프로젝트에는 일지를 쓸 수 없습니다`;
    if (date > today) return '오늘 이후 날짜의 일지는 쓸 수 없습니다';
    if (date < found.plannedStart || date > found.plannedEnd)
      return '프로젝트 기간 밖의 날짜입니다. 기간을 바꾸거나 다른 날짜를 골라 주세요';

    return '';
  })();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">작업일지</h1>
      {failed && <Alert>화면에 필요한 정보를 불러오지 못했습니다</Alert>}

      <div className="flex flex-col gap-2">
        <Select
          aria-label="프로젝트"
          value={projectId}
          onChange={(event) => update({ project: event.target.value })}
        >
          <option value="">프로젝트 선택</option>
          {(projects.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} {item.name} ({PROJECT_STATUS_LABELS[item.status]})
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            aria-label="전날"
            onClick={() => update({ date: addDays(date, -1) })}
          >
            ◀
          </Button>
          <Input
            type="date"
            aria-label="작업일"
            max={today}
            value={date}
            onChange={(event) => event.target.value && update({ date: event.target.value })}
          />
          <Button
            type="button"
            variant="secondary"
            aria-label="다음 날"
            disabled={date >= today}
            onClick={() => update({ date: addDays(date, 1) })}
          >
            ▶
          </Button>
        </div>
      </div>

      {!projectId && !projects.isPending && (
        <p className="text-sm">일지를 쓸 프로젝트를 선택해 주세요</p>
      )}
      {loading && projectId && <p className="text-sm">불러오는 중</p>}
      {project.data && !loading && (
        <>
          <p className="text-sm text-foreground/70">
            <Link className="text-primary underline" to={`/projects/${project.data.id}`}>
              {project.data.name}
            </Link>{' '}
            · {project.data.plannedStart} ~ {project.data.plannedEnd}
          </p>
          {problem && <Alert>{problem}</Alert>}
          {!problem && settings.data && log.isSuccess && isDraftReady && (
            <WorkLogEditor
              key={`${projectId}:${date}:${reloadToken}`}
              project={project.data}
              date={date}
              log={log.data}
              settings={settings.data}
              employees={employees.data ?? []}
              categories={categories}
              assignedEmployeeIds={assignedIds}
              previousDate={previousDate}
              today={today}
              onReload={() => {
                void log.refetch().then(() => setReloadToken((value) => value + 1));
              }}
            />
          )}
          {!problem && isDraftReady && (
            <MaterialDayPanel
              key={`materials:${projectId}:${date}`}
              projectId={projectId}
              date={date}
              categories={categories}
            />
          )}
        </>
      )}

      {projectId && list.data && list.data.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="text-base font-bold">
            최근 일지
          </h2>
          <ul className="divide-y divide-border rounded-md border border-border">
            {[...list.data]
              .sort((a, b) => b.workDate.localeCompare(a.workDate))
              .slice(0, 14)
              .map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex min-h-touch w-full items-center justify-between gap-2 px-3 text-left text-sm"
                    onClick={() => update({ date: item.workDate })}
                  >
                    <span>{formatDay(item.workDate)}</span>
                    <span className="flex gap-2 text-foreground/70">
                      {item.status === 'DRAFT' ? '임시 저장' : WORK_LOG_STATUS_LABELS[item.status]}
                      {item.isLate && <span>지연 입력</span>}
                      <span>{roundTo(minutesToHours(item.totalMinutes), 1)}시간</span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
};
