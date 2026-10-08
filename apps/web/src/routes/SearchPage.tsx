import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { useProject } from '../projects/useProjects';
import { SearchResults } from '../search/SearchResults';
import { useDebouncedValue, useSearch } from '../search/useSearch';

// 통합 검색: 프로젝트·직원·메모·자료·일지를 한 검색창에서 찾는다 (서비스 기획서 §14). `?project=`가 있으면 그 프로젝트 안에서만 찾는다
export const SearchPage = () => {
  const [params, setParams] = useSearchParams();
  const projectId = params.get('project') ?? undefined;
  const project = useProject(projectId ?? '');
  const [text, setText] = useState(params.get('q') ?? '');
  const q = useDebouncedValue(text);
  const results = useSearch(q, projectId);

  const change = (value: string) => {
    setText(value);

    // 주소에도 반영해 새로고침·뒤로 가기 뒤에도 같은 검색이 되게 함
    const next = new URLSearchParams(params);

    if (value.trim()) next.set('q', value);
    else next.delete('q');

    setParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">찾기</h1>
      {projectId && (
        <p className="text-sm text-foreground/70">
          {project.data ? (
            <Link className="text-primary underline" to={`/projects/${projectId}`}>
              {project.data.name}
            </Link>
          ) : (
            '프로젝트'
          )}{' '}
          안에서 메모·자료·일지만 찾습니다 ·{' '}
          <Link
            className="text-primary underline"
            to={`/search${text ? `?q=${encodeURIComponent(text)}` : ''}`}
          >
            전체에서 찾기
          </Link>
        </p>
      )}
      <Input
        type="search"
        autoFocus
        aria-label="검색어"
        placeholder="프로젝트·직원·메모·자료·일지 찾기"
        maxLength={50}
        value={text}
        onChange={(event) => change(event.target.value)}
      />
      {!q.trim() && <p className="text-sm text-foreground/70">찾을 말을 입력해 주세요</p>}
      {q.trim() && results.isPending && <p className="text-sm">찾는 중</p>}
      {results.isError && <Alert>검색하지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>}
      {q.trim() && results.data && <SearchResults results={results.data} />}
    </div>
  );
};
