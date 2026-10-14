import { useNavigate } from 'react-router';
import { useState } from 'react';

import { useMe } from '../auth/useMe';
import { listResumable } from '../drafts/formDraft';
import { ResumeDrafts } from '../drafts/ResumeDrafts';
import { useDraftHydrated } from '../drafts/useLocalDraft';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Alert } from '../components/ui/alert';
import { DashboardWidgets } from '../dashboard/DashboardWidgets';
import { useDashboard } from '../dashboard/useDashboard';
import { useProjectChoices } from '../projects/useProjects';
import { useDraftStore } from '../stores/draftStore';

// 로그인 후 첫 화면 (서비스 기획서 §15.2): 검색, 알림·오늘 투입·위험 프로젝트·진행 프로젝트·이번 주 인력·할 일 위젯,
// 정리 안 된 메모함, 이어서 작성할 초안
export const HomePage = () => {
  const me = useMe();
  const dashboard = useDashboard();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const projects = useProjectChoices();
  const drafts = useDraftStore((state) => state.drafts);
  const isDraftReady = useDraftHydrated();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{me.data?.companyName ?? '홈'}</h1>
        <p className="mt-1 text-sm text-foreground/70">{me.data?.displayName}님, 안녕하세요</p>
      </div>
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();

          if (searchText.trim())
            void navigate(`/search?q=${encodeURIComponent(searchText.trim())}`);
        }}
      >
        <Input
          type="search"
          className="min-w-0 flex-1"
          aria-label="찾기"
          placeholder="프로젝트·직원·메모·자료·작업 내역 찾기"
          maxLength={50}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <Button type="submit">찾기</Button>
      </form>
      {dashboard.isError && <Alert>대시보드를 불러오지 못했습니다</Alert>}
      {dashboard.isPending && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground/70">대시보드를 불러오는 중</p>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}
      {dashboard.data && <DashboardWidgets dashboard={dashboard.data.dashboard} />}
      {isDraftReady && (
        <ResumeDrafts
          drafts={listResumable(drafts)}
          projectNames={new Map((projects.data ?? []).map((project) => [project.id, project.name]))}
        />
      )}
    </section>
  );
};
