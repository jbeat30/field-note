import { PROJECT_STATUS_LABELS, todayInSeoul } from '@field-note/shared';
import { Camera, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { PeriodNav } from '../components/ui/period-nav';
import { useDraftHydrated } from '../drafts/useLocalDraft';
import { useEmployees } from '../employees/useEmployees';
import { addDays, formatDay, formatLongDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';
import { PhotoGrid } from '../photos/PhotoGrid';
import { usePhotoList } from '../photos/usePhotos';
import { useAssignments } from '../projects/useAssignments';
import { useProject } from '../projects/useProjects';
import { useCompanySettings } from '../settings/useCompanySettings';
import { useOptions } from '../settings/useOptions';
import { WorkLogEditor } from '../workLogs/WorkLogEditor';
import { useWorkLog, useWorkLogList } from '../workLogs/useWorkLogs';

const WRITABLE = ['IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'WARRANTY'];

// 그날의 사진: 이 프로젝트에서 그 작업일로 올린 사진 (올리기·자세히 보기는 사진첩)
const DayPhotos = ({ projectId, date }: { projectId: string; date: string }) => {
  const navigate = useNavigate();
  const photos = usePhotoList(projectId, { workDate: date }, 12);
  const items = photos.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section
      className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
      aria-labelledby="day-photos-heading"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="day-photos-heading" className="text-lg font-bold">
          {formatLongDay(date)} 작업 사진
        </h3>
        <Button asChild variant="secondary">
          <Link to={`/projects/${projectId}/photos`}>
            <Camera aria-hidden className="size-5" />
            사진 올리기·전체 보기
          </Link>
        </Button>
      </div>
      {photos.isPending ? (
        <p className="text-sm text-foreground/70">불러오는 중</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-foreground/70">이 날 올린 사진이 없습니다</p>
      ) : (
        <PhotoGrid photos={items} onSelect={() => void navigate(`/projects/${projectId}/photos`)} />
      )}
    </section>
  );
};

// 프로젝트의 하루 작업: 누가 몇 시간 무슨 일을 했는지(사람마다 다를 수 있음), 한 일, 그날 사진·자재를 한곳에서 남긴다
export const ProjectWorkDayPage = () => {
  const { id = '', date = '' } = useParams();
  const navigate = useNavigate();
  const today = todayInSeoul(new Date());
  const project = useProject(id);
  const settings = useCompanySettings();
  const options = useOptions();
  const employees = useEmployees({});
  const assignments = useAssignments(id);
  const log = useWorkLog(id, date);
  const list = useWorkLogList(id);
  // 저장·불러오기 뒤 편집 상태를 새로 만들기 위한 값
  const [reloadToken, setReloadToken] = useState(0);
  // 기기에 저장된 초안을 읽어 온 뒤에 폼을 그려야 복구할 수 있음
  const isDraftReady = useDraftHydrated();

  const goTo = (next: string) => void navigate(projectWorkPath(id, next), { replace: true });

  const loading = [project, settings, options, employees, assignments, log].some(
    (query) => query.isPending && query.fetchStatus !== 'idle',
  );
  const failed = [settings, options, employees].some((query) => query.isError);
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
      return `${PROJECT_STATUS_LABELS[found.status]} 상태의 프로젝트에는 작업 내역을 쓸 수 없습니다`;
    if (date > today) return '오늘 이후 날짜의 작업은 쓸 수 없습니다';
    if (date < found.plannedStart || date > found.plannedEnd)
      return '프로젝트 기간 밖의 날짜입니다. 기간을 바꾸거나 다른 날짜를 골라 주세요';

    return '';
  })();

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="secondary" size="sm" className="self-start">
        <Link to={projectWorkPath(id)}>
          <ChevronLeft aria-hidden />
          작업 달력으로
        </Link>
      </Button>
      <PeriodNav
        label={formatDay(date)}
        prevLabel="전날"
        nextLabel="다음 날"
        nextDisabled={date >= today}
        onPrev={() => goTo(addDays(date, -1))}
        onNext={() => goTo(addDays(date, 1))}
        todayLabel="오늘"
        onToday={() => goTo(today)}
        pickValue={date}
        pickMax={today}
        onPick={goTo}
      />
      {failed && <Alert>화면에 필요한 정보를 불러오지 못했습니다</Alert>}
      {loading && <p className="text-sm">불러오는 중</p>}
      {project.data && !loading && (
        <>
          {problem && <Alert>{problem}</Alert>}
          {!problem && settings.data && log.isSuccess && isDraftReady && (
            <WorkLogEditor
              key={`${id}:${date}:${reloadToken}`}
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
          {!problem && <DayPhotos projectId={id} date={date} />}
          {!problem && (
            <p className="text-sm text-foreground/70">
              이 날 쓴 자재는{' '}
              <Link
                className="font-medium text-primary underline"
                to={`/projects/${id}/materials?date=${date}`}
              >
                자재 메뉴
              </Link>
              에서 기록합니다
            </p>
          )}
        </>
      )}
    </div>
  );
};
