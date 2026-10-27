import { todayInSeoul } from '@field-note/shared';
import { FolderPlus } from 'lucide-react';
import { Link } from 'react-router';

import { useMe } from '../auth/useMe';
import { listResumable } from '../drafts/formDraft';
import { ResumeDrafts } from '../drafts/ResumeDrafts';
import { useDraftHydrated } from '../drafts/useLocalDraft';
import { pillIconButtonClass } from '../components/ui/button';
import { PageHeader } from '../components/ui/page-header';
import { Skeleton } from '../components/ui/skeleton';
import { Alert } from '../components/ui/alert';
import { AlertBell } from '../dashboard/AlertBell';
import { DashboardWidgets } from '../dashboard/DashboardWidgets';
import { HeaderSearch } from '../dashboard/HeaderSearch';
import { MonthStaffing } from '../dashboard/MonthStaffing';
import { useDashboard } from '../dashboard/useDashboard';
import { cn } from '../lib/cn';
import { useProjectChoices } from '../projects/useProjects';
import { useDraftStore } from '../stores/draftStore';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// "2026.10.15 목요일"
const dateText = (date: string) => {
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

  return `${date.replaceAll('-', '.')} ${weekday}요일`;
};

// 로그인 후 첫 화면: 인사·오늘 날짜와 프로젝트 등록, 검색, 수치 줄, 진행 중 프로젝트·확인할 일, 이번 달 인력
// 보증·만료 임박, 이어서 작성할 초안
export const HomePage = () => {
  const me = useMe();
  const dashboard = useDashboard();
  const projects = useProjectChoices();
  const drafts = useDraftStore((state) => state.drafts);
  const isDraftReady = useDraftHydrated();

  return (
    <section className="flex flex-col gap-4">
      <PageHeader
        isDisplay
        overlap
        eyebrow={
          <span>
            {me.data?.companyName} ·{' '}
            <span className="font-emphasis">{dateText(todayInSeoul(new Date()))}</span>
          </span>
        }
        title={
          <>
            안녕하세요,
            <br className="2xl:hidden" /> {me.data?.displayName}님
          </>
        }
        actions={
          <>
            <div className="flex items-center gap-2.5 max-md:hidden">
              <HeaderSearch />
              <AlertBell />
            </div>
            <Link
              to="/projects/new"
              className={cn(pillIconButtonClass, 'h-[52px] w-full md:h-14 md:w-auto')}
            >
              <FolderPlus aria-hidden />
              프로젝트 등록
            </Link>
          </>
        }
      />
      {dashboard.isError && <Alert>대시보드를 불러오지 못했습니다</Alert>}
      {dashboard.isPending && (
        // 지표 타일, 진행 중 프로젝트와 확인할 일 두 칸, 아래 카드 자리를 실제 화면과 같은 배치로 깔아 둠
        <div className="flex flex-col gap-4" role="status" aria-busy>
          <span className="sr-only">대시보드를 불러오는 중</span>
          <div className="relative -mt-12 grid grid-cols-2 gap-3 md:-mt-[92px] xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[154px] rounded-[30px]" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Skeleton className="h-72 rounded-[32px] lg:h-[640px]" />
            <Skeleton className="h-72 rounded-[32px] lg:h-[640px]" />
          </div>
        </div>
      )}
      {dashboard.data && (
        <DashboardWidgets
          dashboard={dashboard.data.dashboard}
          monthSlot={<MonthStaffing dashboard={dashboard.data.dashboard} />}
        />
      )}
      {isDraftReady && (
        <ResumeDrafts
          drafts={listResumable(drafts)}
          projectNames={new Map((projects.data ?? []).map((project) => [project.id, project.name]))}
        />
      )}
    </section>
  );
};
