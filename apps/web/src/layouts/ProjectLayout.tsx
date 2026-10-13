import { PROJECT_STATUS_LABELS, todayInSeoul, type ProjectStatus } from '@field-note/shared';
import { CalendarRange, MapPin, UserRound, Building2 } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useEmployees } from '../employees/useEmployees';
import { cn } from '../lib/cn';
import { projectWorkPath } from '../lib/projectPaths';
import { usePartners } from '../partners/usePartners';
import { useProject } from '../projects/useProjects';

export const STATUS_TONE: Record<
  ProjectStatus,
  'neutral' | 'primary' | 'success' | 'warning' | 'danger'
> = {
  PLANNED: 'neutral',
  IN_PROGRESS: 'primary',
  SUSPENDED: 'warning',
  COMPLETED: 'success',
  WARRANTY: 'success',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
};

// 보증 화면은 완료 이후 상태에서만 보인다 (종료는 조회만)
const WARRANTY_STATUSES: readonly string[] = ['COMPLETED', 'WARRANTY', 'CLOSED'];

// 오늘 기준 남은 일수 문구 (끝나기 전이면 "D-N", 지났으면 "N일 지남")
const dueText = (end: string, status: ProjectStatus) => {
  if (['COMPLETED', 'WARRANTY', 'CLOSED', 'CANCELLED'].includes(status)) return null;

  const days = Math.round(
    (new Date(`${end}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
  );

  return days < 0 ? `${-days}일 지남` : days === 0 ? '오늘 종료 예정' : `D-${days}`;
};

// 프로젝트 작업 공간 공통 틀: 프로젝트 정보 머리 + 메뉴(개요·사진·메모·자재·문서·변경·일보·요약·보수·보증)
// /projects/:id 아래 모든 화면이 이 틀 안에서 열려, 메뉴로 오가며 한 프로젝트를 관리한다
export const ProjectLayout = () => {
  const { id = '' } = useParams();
  const { pathname } = useLocation();
  const project = useProject(id);
  const partners = usePartners({});
  const employees = useEmployees({});

  if (project.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <p className="text-sm">프로젝트를 불러오는 중</p>
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (project.isError) return <Alert>프로젝트를 불러오지 못했습니다</Alert>;

  if (!project.data) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">프로젝트를 찾을 수 없습니다</h1>
        <Link className="min-h-touch content-center text-primary underline" to="/projects">
          프로젝트 목록으로
        </Link>
      </div>
    );
  }

  const data = project.data;
  const client = partners.data?.find((item) => item.id === data.clientId)?.name;
  const manager = employees.data?.find((item) => item.id === data.managerId)?.name;
  const due = dueText(data.plannedEnd, data.status);
  const base = `/projects/${data.id}`;
  const closeout = [`${base}/summary`, `${base}/repairs`, `${base}/warranty`];
  const inCloseout = closeout.some((path) => pathname.startsWith(path));
  const showWarranty = WARRANTY_STATUSES.includes(data.status);
  const tabs: { to: string; label: string; end?: boolean; active?: boolean }[] = [
    { to: base, label: '작업 달력', end: true },
    { to: `${base}/overview`, label: '현황' },
    { to: `${base}/assignments`, label: '인원' },
    { to: `${base}/materials`, label: '자재' },
    { to: `${base}/photos`, label: '사진' },
    { to: `${base}/memos`, label: '메모' },
    { to: `${base}/documents`, label: '문서' },
    { to: `${base}/labor`, label: '공수·인건비' },
    { to: `${base}/change-works`, label: '추가 공사' },
    { to: `${base}/summary`, label: '마감·보증', active: inCloseout },
    { to: `${base}/info`, label: '정보 수정' },
  ];
  const closeoutTabs = [
    { to: `${base}/summary`, label: '마감 요약' },
    ...(showWarranty
      ? [
          { to: `${base}/repairs`, label: '보수' },
          { to: `${base}/warranty`, label: '보증' },
        ]
      : []),
    { to: `${base}/daily-report`, label: '일보 출력' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <BackLink className="print:hidden" to="/projects">
        프로젝트 목록
      </BackLink>

      <header className="flex flex-col gap-4 rounded-xl bg-surface-subtle p-5 sm:p-6 print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <span className="font-medium">{data.code}</span>
              <Badge tone={STATUS_TONE[data.status]}>{PROJECT_STATUS_LABELS[data.status]}</Badge>
              {due && <Badge tone={due.includes('지남') ? 'danger' : 'neutral'}>{due}</Badge>}
            </div>
            <h1 className="text-2xl font-bold tracking-tight break-keep">{data.name}</h1>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild>
              <Link to={projectWorkPath(data.id, todayInSeoul(new Date()))}>오늘 작업 입력</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to={`/search?project=${data.id}`}>프로젝트 안에서 찾기</Link>
            </Button>
          </div>
        </div>
        <ul className="hidden gap-x-8 gap-y-3 text-sm sm:grid sm:grid-cols-2 xl:grid-cols-4">
          <Fact icon={MapPin} label="현장">
            {data.siteName || '-'}
            {data.siteMapUrl && (
              <a
                className="ml-2 text-primary underline"
                href={data.siteMapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                지도 열기
              </a>
            )}
          </Fact>
          <Fact icon={Building2} label="고객">
            {client ?? '-'}
          </Fact>
          <Fact icon={UserRound} label="담당자">
            {manager ?? '-'}
          </Fact>
          <Fact icon={CalendarRange} label="예정 기간">
            {data.plannedStart} ~ {data.plannedEnd}
          </Fact>
        </ul>
      </header>

      <nav
        aria-label="프로젝트 메뉴"
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0 print:hidden"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                '-mb-px flex min-h-touch items-center border-b-2 px-4 text-sm font-medium whitespace-nowrap transition-colors',
                // 하루 작업 화면(/work/날짜)에서도 "작업" 메뉴를 강조
                isActive ||
                  tab.active ||
                  (tab.end && pathname.startsWith(`${tab.to}/work/`)) ||
                  (tab.label === '마감·보증' && pathname.startsWith(`${base}/daily-report`))
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground/70 hover:text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {(inCloseout || pathname.startsWith(`${base}/daily-report`)) && (
        <nav
          aria-label="마감·보증 메뉴"
          className="flex gap-1 self-start rounded-xl bg-muted p-1 print:hidden"
        >
          {closeoutTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-touch items-center rounded-lg px-4 text-sm font-medium whitespace-nowrap',
                  isActive ? 'bg-surface text-foreground shadow-xs' : 'text-foreground/70',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}

      <Outlet />
    </div>
  );
};

const Fact = ({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) => (
  <li className="flex items-start gap-2">
    <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground/70" />
    <div className="min-w-0">
      <span className="block text-xs text-foreground/70">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  </li>
);
