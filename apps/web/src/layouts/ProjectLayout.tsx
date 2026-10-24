import { PROJECT_STATUS_LABELS, todayInSeoul, type ProjectStatus } from '@field-note/shared';
import { MoreHorizontal, Pencil, Printer } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button, pillIconButtonClass } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { SummaryExportButton } from '../completion/SummaryExportButton';
import { Skeleton } from '../components/ui/skeleton';
import { useEmployees } from '../employees/useEmployees';
import { cn } from '../lib/cn';
import { formatLongDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';
import { usePartners } from '../partners/usePartners';
import { useProject } from '../projects/useProjects';
import { LoadingBlock } from '../components/ui/loading-block';

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
    // 머리 평면과 탭 줄을 같은 크기로 먼저 깔아 내용이 나올 때 화면이 밀리지 않게 함
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <div className="plane pt-4 pb-14 md:pt-8 md:pb-16 print:hidden">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24 bg-[#fbf7ee]/45" />
            <Skeleton className="h-7 w-40 rounded-full bg-[#fbf7ee]/45" />
            <Skeleton className="h-9 w-2/3 max-w-xl bg-[#fbf7ee]/45 md:h-12" />
            <Skeleton className="h-4 w-1/2 max-w-md bg-[#fbf7ee]/45" />
          </div>
        </div>
        <Skeleton className="relative -mt-10 h-[50px] w-full max-w-[860px] rounded-full bg-track" />
        <LoadingBlock label="프로젝트를 불러오는 중" variant="page" />
      </div>
    );
  }

  if (project.isError) return <Alert>프로젝트를 불러오지 못했습니다</Alert>;

  if (!project.data) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">프로젝트를 찾을 수 없습니다</h1>
        <Link className="min-h-touch content-center text-primary hover:text-sub" to="/projects">
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
  // 작업일 입력 화면은 제목을 날짜로, 프로젝트 이름은 아래 정보 줄 앞으로
  const workDate = /\/work\/(\d{4}-\d{2}-\d{2})$/.exec(pathname)?.[1];

  const tabs: { to: string; label: string; end?: boolean; active?: boolean }[] = [
    { to: base, label: '작업 달력', end: true },
    { to: `${base}/overview`, label: '현황' },
    { to: `${base}/assignments`, label: '인원' },
    { to: `${base}/materials`, label: '비용·자재' },
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
      {/* 프로젝트 머리: 주황 평면에 돌아가기, 번호·상태 알약, 이름, 현장·고객·담당자·기간 한 줄, 오른쪽 주 버튼 */}
      <div className="plane pt-4 pb-14 md:pt-8 md:pb-16 print:hidden">
        <BackLink to="/projects">프로젝트 목록</BackLink>
        <header className="mt-1 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              <span className="rounded-full bg-[#fbf7ee] px-2.5 py-0.5">{data.code}</span>
              <Badge tone={STATUS_TONE[data.status]}>{PROJECT_STATUS_LABELS[data.status]}</Badge>
              {due && <Badge tone={due.includes('지남') ? 'danger' : 'primary'}>{due}</Badge>}
            </div>
            <h1 className="text-[28px] leading-[1.1] font-extrabold tracking-[-0.03em] break-keep md:text-[46px]">
              {workDate ? `${formatLongDay(workDate)} 작업` : data.name}
            </h1>
            <p className="text-[15px] font-medium">
              {[
                workDate && data.name,
                data.siteName,
                client,
                manager && `담당 ${manager}`,
                `${data.plannedStart} ~ ${data.plannedEnd}`,
              ]
                .filter(Boolean)
                .join(', ')}
              {data.siteMapUrl && (
                <a
                  className="ml-2 font-bold hover:text-sub"
                  href={data.siteMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  지도 열기
                </a>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showTodayBtn && (
              <Link
                to={projectWorkPath(data.id, todayInSeoul(new Date()))}
                className={pillIconButtonClass}
              >
                <Pencil aria-hidden />
                오늘 기록
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="더보기"
                  className="inline-flex size-[50px] items-center justify-center rounded-full bg-[#fbf7ee] text-[#14110d] hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  <MoreHorizontal aria-hidden className="size-5" />
                </button>
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
        </header>
      </div>

      {/* 서브 메뉴: 트랙 안의 알약, 가로 스크롤만, 세로 스크롤바 없음, 현재 탭 자동 스크롤 */}
      <nav
        ref={navRef}
        aria-label="프로젝트 메뉴"
        className="relative -mt-10 flex gap-1 overflow-x-auto overflow-y-hidden rounded-full bg-track p-[5px] [scrollbar-width:none] sm:w-fit sm:max-w-full print:hidden [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex min-h-10 items-center rounded-full px-5 text-sm font-bold whitespace-nowrap transition-colors',
                isActive ||
                  tab.active ||
                  (tab.end && pathname.startsWith(`${tab.to}/work/`)) ||
                  (tab.label === '마감·보증' && pathname.startsWith(`${base}/daily-report`))
                  ? 'bg-primary font-bold text-primary-foreground'
                  : 'text-sub hover:text-foreground',
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
            className="flex gap-1 self-start rounded-full bg-track p-1"
          >
            {closeoutTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-10 items-center rounded-full px-5 text-sm font-bold whitespace-nowrap',
                    isActive ? 'bg-primary font-bold text-primary-foreground' : 'text-sub',
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {pathname.startsWith(`${base}/summary`) && <SummaryExportButton projectId={data.id} />}
            <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer aria-hidden />
              인쇄·PDF
            </Button>
          </div>
        </div>
      )}

      <Outlet />
    </div>
  );
};
