import {
  PROJECT_SORTS,
  PROJECT_SORT_LABELS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectListQuery,
  type ProjectSort,
  type ProjectStatus,
} from '@field-note/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { useEmployees } from '../employees/useEmployees';
import { usePartners } from '../partners/usePartners';
import { useProjects } from '../projects/useProjects';
import { useOptions } from '../settings/useOptions';

// 프로젝트 목록: 코드·이름·상태·현장·고객·담당자·공종·기간만 보여 준다 (현장 연락처·출입 메모는 카드에서만)
export const ProjectListPage = () => {
  const [filter, setFilter] = useState<ProjectListQuery>({});
  const projects = useProjects(filter);
  const options = useOptions();
  const partners = usePartners({});
  const employees = useEmployees({});
  const update = (patch: Partial<ProjectListQuery>) =>
    setFilter((current) => ({ ...current, ...patch }));
  const names = new Map([
    ...(options.data ?? []).map((item) => [item.id, item.name] as const),
    ...(partners.data ?? []).map((item) => [item.id, item.name] as const),
    ...(employees.data ?? []).map((item) => [item.id, item.name] as const),
  ]);
  const trades = (options.data ?? []).filter((item) => item.kind === 'TRADE');
  const isFiltered = Object.values(filter).some(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">프로젝트</h1>
        <Button asChild>
          <Link to="/projects/new">프로젝트 등록</Link>
        </Button>
      </div>

      <section className="flex flex-col gap-3" aria-label="검색과 필터">
        <Input
          type="search"
          aria-label="프로젝트 검색"
          placeholder="프로젝트명·코드·현장 검색"
          value={filter.q ?? ''}
          onChange={(event) => update({ q: event.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label="상태 필터"
            value={filter.status ?? ''}
            onChange={(event) =>
              update({ status: (event.target.value || undefined) as ProjectStatus | undefined })
            }
          >
            <option value="">전체 상태</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="정렬"
            value={filter.sort ?? 'recent'}
            onChange={(event) => update({ sort: event.target.value as ProjectSort })}
          >
            {PROJECT_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {PROJECT_SORT_LABELS[sort]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="고객 필터"
            value={filter.clientId ?? ''}
            onChange={(event) => update({ clientId: event.target.value || undefined })}
          >
            <option value="">전체 고객</option>
            {(partners.data ?? [])
              .filter((item) => item.kind === 'CLIENT')
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </Select>
          <Select
            aria-label="담당자 필터"
            value={filter.managerId ?? ''}
            onChange={(event) => update({ managerId: event.target.value || undefined })}
          >
            <option value="">전체 담당자</option>
            {(employees.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="공종 필터"
            className="col-span-2"
            value={filter.tradeId ?? ''}
            onChange={(event) => update({ tradeId: event.target.value || undefined })}
          >
            <option value="">전체 공종</option>
            {trades.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            기간 시작
            <Input
              type="date"
              value={filter.from ?? ''}
              onChange={(event) => update({ from: event.target.value || undefined })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            기간 끝
            <Input
              type="date"
              value={filter.to ?? ''}
              onChange={(event) => update({ to: event.target.value || undefined })}
            />
          </label>
        </div>
        {isFiltered && (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => setFilter({})}
          >
            필터 지우기
          </Button>
        )}
      </section>

      {projects.isPending && <p className="text-sm">프로젝트를 불러오는 중</p>}
      {projects.isError && <Alert>프로젝트 목록을 불러오지 못했습니다</Alert>}
      {projects.data && (
        <section className="flex flex-col gap-2" aria-label="프로젝트 목록">
          <p className="text-sm text-foreground/70" aria-live="polite">
            {projects.data.length}건
          </p>
          {projects.data.length === 0 ? (
            <p className="text-sm">조건에 맞는 프로젝트가 없습니다</p>
          ) : (
            <ul className="divide-y divide-border">
              {projects.data.map((project) => (
                <li key={project.id}>
                  <Link className="flex flex-col gap-1 py-3" to={`/projects/${project.id}`}>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-foreground/70">{project.code}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                    </span>
                    <span className="font-medium">{project.name}</span>
                    <span className="text-sm text-foreground/70">
                      {[project.siteName, names.get(project.clientId), names.get(project.managerId)]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <span className="text-sm text-foreground/70">
                      {project.plannedStart} ~ {project.plannedEnd}
                      {project.tradeIds.length > 0 &&
                        ` · ${project.tradeIds
                          .map((id) => names.get(id))
                          .filter(Boolean)
                          .join(', ')}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
