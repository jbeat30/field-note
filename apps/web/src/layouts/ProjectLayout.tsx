import { PROJECT_STATUS_LABELS, todayInSeoul, type ProjectStatus } from '@field-note/shared';
import { CalendarRange, MapPin, MoreHorizontal, Printer, UserRound, Building2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
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

const WARRANTY_STATUSES: readonly string[] = ['COMPLETED', 'WARRANTY', 'CLOSED'];
// 오늘 기록 버튼을 보여 줄 상태
const WRITABLE: readonly string[] = ['IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'WARRANTY'];

const dueText = (end: string, status: ProjectStatus) => {
  if (['COMPLETED', 'WARRANTY', 'CLOSED', 'CANCELLED'].includes(status)) return null;

  const days = Math.round(
    (new Date(`${end}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
  );

  return days < 0 ? `${-days}일 지남` : days === 0 ? '오늘 종료 예정' : `D-${days}`;
};

// 프로젝트 작업 공간 공통 틀: 프로젝트 정보 머리 + 서브 메뉴 + 콘텐츠
export const ProjectLayout = () => {
  const { id = '' } = useParams();
  const { pathname } = useLocation();
  const project = useProject(id);
  const partners = usePartners({});
  const employees = useEmployees({});
  const navRef = useRef<HTMLElement>(null);

  // 경로가 바뀌면 활성 탭이 보이도록 자동 스크롤
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [pathname]);

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
  const showTodayBtn = WRITABLE.includes(data.status);

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
    <div className="flex flex-col gap-4">
      <BackLink className="print:hidden" to="/projects">
        프로젝트 목록
      </BackLink>

      {/* 프로젝트 머리: 1줄 번호·이름·상태·남은 기간 + 주 버튼·더보기, 2줄 현장·고객·담당자·기간 */}
      <header className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4 sm:p-5 print:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-foreground/70">
              <span className="font-medium">{data.code}</span>
              <Badge tone={STATUS_TONE[data.status]}>{PROJECT_STATUS_LABELS[data.status]}</Badge>
              {due && <Badge tone={due.includes('지남') ? 'danger' : 'neutral'}>{due}</Badge>}
            </div>
            <h1 className="text-xl font-bold tracking-tight break-keep">{data.name}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {showTodayBtn && (
              <Button size="sm" asChild>
                <Link to={projectWorkPath(data.id, todayInSeoul(new Date()))}>오늘 기록</Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="icon-sm" variant="ghost" aria-label="더보기">
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link to={`${base}/info`}>정보 수정</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`${base}/daily-report`}>일보 출력</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/search?project=${data.id}`}>프로젝트 안에서 찾기</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <ul className="hidden flex-wrap gap-x-6 gap-y-2 text-sm sm:flex">
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

      {/* 서브 메뉴: 가로 스크롤만, 세로 스크롤바 없음, 현재 탭 자동 스크롤 */}
      <nav
        ref={navRef}
        aria-label="프로젝트 메뉴"
        className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 print:hidden"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                '-mb-px flex min-h-touch items-center border-b-2 px-4 text-sm font-medium whitespace-nowrap transition-colors',
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
        <div className="flex items-center justify-between gap-3 print:hidden">
          <nav
            aria-label="마감·보증 메뉴"
            className="flex gap-1 self-start rounded-xl bg-muted p-1"
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            className="shrink-0"
          >
            <Printer aria-hidden />
            인쇄·PDF
          </Button>
        </div>
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
  <li className="flex items-center gap-1.5">
    <Icon aria-hidden className="size-4 shrink-0 text-foreground/70" />
    <span className="text-foreground/70">{label}</span>
    <span className="font-medium">{children}</span>
  </li>
);
