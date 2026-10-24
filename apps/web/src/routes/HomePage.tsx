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
import { LoadingBlock } from '../components/ui/loading-block';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// "10월 15일 목요일"
const dateText = (date: string) => {
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일 ${weekday}요일`;
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
          <>
            {me.data?.companyName} · {dateText(todayInSeoul(new Date()))}
          </>
        }
        title={
          <>
            안녕하세요,
            <br />
            {me.data?.displayName}님
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
        <div className="flex flex-col gap-3">
          <LoadingBlock label="대시보드를 불러오는 중" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-3xl" />
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
