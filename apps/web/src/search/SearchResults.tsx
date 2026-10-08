import {
  SEARCH_HIT_TYPE_LABELS,
  type SearchGroup,
  type SearchHit,
  type SearchHitType,
  type SearchResponse,
} from '@field-note/shared';
import { Link } from 'react-router';

import { formatDay } from '../lib/dates';

import { searchHitLink } from './searchLink';

type SearchResultsProps = {
  results: SearchResponse;
};

const BADGE_LABELS = { SENSITIVE: '민감', LEFT: '퇴사' } as const;

const GROUPS: { key: keyof Omit<SearchResponse, 'q'>; type: SearchHitType }[] = [
  { key: 'projects', type: 'PROJECT' },
  { key: 'employees', type: 'EMPLOYEE' },
  { key: 'memos', type: 'MEMO' },
  { key: 'documents', type: 'DOCUMENT' },
  { key: 'workLogs', type: 'WORK_LOG' },
];

const Hit = ({ hit }: { hit: SearchHit }) => (
  <li>
    <Link
      to={searchHitLink(hit)}
      className="flex min-h-touch flex-col gap-0.5 rounded-md border border-border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="flex flex-wrap items-center gap-2 font-medium">
        {hit.title}
        {hit.badge && (
          <span className="rounded bg-danger px-1.5 py-0.5 text-xs font-normal text-primary-foreground">
            {BADGE_LABELS[hit.badge]}
          </span>
        )}
      </span>
      {hit.snippet && <span className="text-sm text-foreground/80">{hit.snippet}</span>}
      {(hit.projectName || hit.date) && hit.type !== 'PROJECT' && (
        <span className="text-xs text-foreground/70">
          {[hit.projectName, hit.date ? formatDay(hit.date) : null].filter(Boolean).join(' · ')}
        </span>
      )}
    </Link>
  </li>
);

// 통합 검색 결과: 프로젝트·직원·메모·자료·일지로 나눠 보여 주고, 종류마다 개수를 제한한 만큼 더 있으면 검색어를 좁히도록 안내
export const SearchResults = ({ results }: SearchResultsProps) => {
  const visible = GROUPS.filter(({ key }) => results[key].items.length > 0);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-foreground/70" role="status">
        ‘{results.q}’에 맞는 결과가 없습니다
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {visible.map(({ key, type }) => {
        const group: SearchGroup = results[key];

        return (
          <section
            key={key}
            className="flex flex-col gap-2"
            aria-label={SEARCH_HIT_TYPE_LABELS[type]}
          >
            <h2 className="text-base font-bold">{SEARCH_HIT_TYPE_LABELS[type]}</h2>
            <ul className="flex flex-col gap-2">
              {group.items.map((hit) => (
                <Hit key={`${hit.type}:${hit.id}`} hit={hit} />
              ))}
            </ul>
            {group.hasMore && (
              <p className="text-sm text-foreground/70">
                {SEARCH_HIT_TYPE_LABELS[type]} 결과가 더 있습니다. 검색어를 더 구체적으로 입력해
                보세요
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
};
