import { Link, useNavigate } from 'react-router';
import { useState } from 'react';

import { useMe } from '../auth/useMe';
import { listResumable } from '../drafts/formDraft';
import { ResumeDrafts } from '../drafts/ResumeDrafts';
import { useDraftHydrated } from '../drafts/useLocalDraft';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useMemoSummary } from '../memos/useMemos';
import { useProjects } from '../projects/useProjects';
import { useDraftStore } from '../stores/draftStore';

// 로그인 후 첫 화면: 정리 안 된 메모함과 끝내지 않은 할 일을 알려 준다 (대시보드의 나머지는 이후 단계)
export const HomePage = () => {
  const me = useMe();
  const summary = useMemoSummary();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const projects = useProjects({});
  const drafts = useDraftStore((state) => state.drafts);
  const isDraftReady = useDraftHydrated();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{me.data?.companyName ?? '홈'}</h1>
        <p className="mt-2 text-sm">{me.data?.displayName}님, 안녕하세요</p>
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
          placeholder="프로젝트·직원·메모·자료·일지 찾기"
          maxLength={50}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <Button type="submit">찾기</Button>
      </form>
      <Link
        to="/inbox"
        className="flex min-h-touch flex-col gap-1 rounded-md border border-border p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="text-lg font-bold">메모함</span>
        {summary.data ? (
          <span className="text-sm" aria-live="polite">
            정리 안 된 메모 {summary.data.inboxCount}건 · 끝내지 않은 할 일{' '}
            {summary.data.openTodoCount}건
          </span>
        ) : (
          <span className="text-sm text-foreground/70">불러오는 중</span>
        )}
      </Link>
      {isDraftReady && (
        <ResumeDrafts
          drafts={listResumable(drafts)}
          projectNames={new Map((projects.data ?? []).map((project) => [project.id, project.name]))}
        />
      )}
    </section>
  );
};
