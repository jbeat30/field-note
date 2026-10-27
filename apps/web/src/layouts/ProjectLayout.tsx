import { PROJECT_STATUS_LABELS, todayInSeoul, type ProjectStatus } from '@field-note/shared';
import { MoreHorizontal, Pencil, Printer } from 'lucide-react';
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
import { SummaryExportButton } from '../completion/SummaryExportButton';
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

// "26.09.01"
const shortDay = (date: string) => date.slice(2).replaceAll('-', '.');

const dueText = (end: string, status: ProjectStatus) => {
  if (['COMPLETED', 'WARRANTY', 'CLOSED', 'CANCELLED'].includes(status)) return null;

  const days = Math.round(
    (new Date(`${end}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
  );

  return days < 0 ? `${-days}일 지남` : days === 0 ? '오늘 종료 예정' : `D-${days}`;
};

// 프로젝트 작업 공간 공통 틀: 프로젝트 정보 머리 + 서브 메뉴 + 콘텐츠
// 프로젝트 탭 줄의 실제 알약 너비 (탭 글자 길이에 맞춘 값)
const TAB_SKELETON_WIDTHS = [91, 64, 64, 92, 64, 64, 64, 104, 91, 92];

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
    // 실제 머리 평면, 탭 줄, 본문 첫 구역과 같은 크기로 먼저 깔아 내용이 나올 때 화면이 밀리지 않게 함
    return (
      <div className="flex flex-col gap-4" aria-busy role="status">
        <span className="sr-only">프로젝트를 불러오는 중</span>
        <div className="plane pt-4 pb-24 md:pt-8 md:pb-[7.5rem] print:hidden">
          <div className="flex min-h-touch items-center">
            <Skeleton className="h-4 w-24 bg-[#fbf7ee]/45" />
          </div>
          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-[22px] w-40 rounded-full bg-[#fbf7ee]/45" />
              <Skeleton className="h-[31px] w-2/3 max-w-xl bg-[#fbf7ee]/45 md:h-[51px]" />
              <Skeleton className="h-[23px] w-1/2 max-w-md bg-[#fbf7ee]/45" />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Skeleton className="hidden h-[50px] w-[129px] rounded-full bg-[#fbf7ee]/45 sm:block" />
              <Skeleton className="size-[50px] rounded-full bg-[#fbf7ee]/45" />
            </div>
          </div>
        </div>
        <Skeleton className="relative -mt-24 h-[104px] rounded-[30px] md:-mt-[84px]" />
        <div className="relative flex gap-1 overflow-hidden rounded-full bg-track p-[5px] sm:w-fit sm:max-w-full">
          {TAB_SKELETON_WIDTHS.map((width, index) => (
            <Skeleton
              key={index}
              className="h-10 shrink-0 rounded-full bg-[#fbf7ee]/70"
              style={{ width }}
            />
          ))}
        </div>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-4">
            <Skeleton className="h-[108px] rounded-[24px] md:h-[153px] md:rounded-[30px]" />
            <Skeleton className="h-[108px] rounded-[24px] md:h-[153px] md:rounded-[30px]" />
            <Skeleton className="h-[108px] rounded-[24px] md:h-[153px] md:rounded-[30px]" />
          </div>
          <Skeleton className="h-[618px] rounded-[30px] md:h-[759px]" />
          <Skeleton className="h-[302px] rounded-[30px]" />
        </div>
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
    { to: base, label: '현황', end: true },
    { to: `${base}/assignments`, label: '인원' },
    { to: `${base}/logs`, label: '일지', active: pathname.startsWith(`${base}/work/`) },
    { to: `${base}/photos`, label: '사진' },
    { to: `${base}/memos`, label: '메모' },
    { to: `${base}/documents`, label: '문서' },
    { to: `${base}/materials`, label: '자재' },
    { to: `${base}/labor`, label: '공수' },
    { to: `${base}/change-works`, label: '추가 공사' },
    { to: `${base}/summary`, label: '마감 · 보증', active: inCloseout },
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
      {/* 프로젝트 머리: 주황 평면에 돌아가기, 번호·상태 알약, 이름, 오른쪽 주 버튼, 평면에 걸친 잉크 정보 카드(현장·고객·담당자·기간) */}
      <div
        className={cn(
          'plane pt-4 md:pt-8 print:hidden',
          workDate ? 'pb-10 md:pb-14' : 'pb-24 md:pb-[7.5rem]',
        )}
      >
        <BackLink to={workDate ? base : '/projects'}>
          {workDate ? data.name : '프로젝트 목록'}
        </BackLink>
        <header className="mt-1 flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5 text-sm font-bold">
              <span className="font-emphasis">{data.code}</span>
              {workDate ? (
                <span>{data.name}</span>
              ) : (
                <>
                  <Badge tone="ink">{PROJECT_STATUS_LABELS[data.status]}</Badge>
                  {due && <Badge tone={due.includes('지남') ? 'danger' : 'neutral'}>{due}</Badge>}
                </>
              )}
            </div>
            <h1 className="text-[32px] leading-[1.02] font-extrabold tracking-[-0.025em] break-keep md:text-[clamp(40px,2.9vw,56px)]">
              {workDate ? '작업일지' : data.name}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showTodayBtn && !workDate && (
              <Link
                to={projectWorkPath(data.id, todayInSeoul(new Date()))}
                className="inline-flex h-[52px] items-center gap-2 rounded-full bg-[#fbf7ee] px-6 text-[15px] font-bold text-[#14110d] hover:opacity-85 max-sm:size-[50px] max-sm:justify-center max-sm:px-0"
              >
                <Pencil aria-hidden className="size-4" />
                <span className="max-sm:sr-only">오늘 일지 쓰기</span>
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="더보기"
                  className="inline-flex size-[52px] items-center justify-center rounded-full bg-[#14110d] text-[#fbf7ee] hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
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

      {!workDate && (
        <dl className="relative -mt-24 grid grid-cols-2 gap-x-6 gap-y-4 rounded-[30px] bg-[#14110d] px-6 py-5 text-[#fcf9f2] md:-mt-[84px] md:grid-cols-4 md:px-8 md:py-6 print:hidden">
          {[
            { label: '현장', value: data.siteAddress || data.siteName, isMap: true },
            { label: '고객', value: client },
            { label: '담당자', value: manager },
            {
              label: '기간',
              value: `${shortDay(data.plannedStart)} – ${shortDay(data.plannedEnd)}`,
              isNumber: true,
            },
          ].map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="mb-1 text-[12.5px] font-bold text-[#b3a78f]">{item.label}</dt>
              <dd
                className={cn(
                  'text-[17px] font-bold break-words',
                  item.isNumber && 'font-emphasis',
                )}
              >
                {item.value || '-'}
                {item.isMap && data.siteMapUrl && (
                  <>
                    {' '}
                    <a
                      className="-my-2.5 inline-block py-2.5 text-sm font-bold whitespace-nowrap text-accent hover:opacity-85"
                      href={data.siteMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      지도 열기
                    </a>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* 서브 메뉴: 트랙 안의 알약, 가로 스크롤만, 세로 스크롤바 없음, 현재 탭 자동 스크롤 */}
      {!workDate && (
        <nav
          ref={navRef}
          aria-label="프로젝트 메뉴"
          className="flex gap-0.5 overflow-x-auto overflow-y-hidden rounded-full bg-field p-[5px] [scrollbar-width:none] print:hidden [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[46px] items-center rounded-full px-[22px] text-[15px] font-bold whitespace-nowrap transition-colors',
                  isActive ||
                    tab.active ||
                    (tab.label === '현황' && pathname.startsWith(`${base}/overview`)) ||
                    (tab.label === '마감 · 보증' && pathname.startsWith(`${base}/daily-report`))
                    ? 'bg-primary font-bold text-primary-foreground'
                    : 'text-sub hover:bg-track hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}

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
