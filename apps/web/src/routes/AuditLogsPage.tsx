import {
  AUDIT_KINDS,
  AUDIT_KIND_LABELS,
  AUDIT_ACTION_TITLES,
  type AuditKind,
  type AuditLog,
} from '@field-note/shared';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { BackLink } from '../components/ui/back-link';
import { useAuditLogs, type AuditFilter } from '../audit/useAuditLogs';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Chip } from '../components/ui/chip';
import { EmptyState } from '../components/ui/empty-state';
import { FormField } from '../components/ui/form-field';
import { DateInput } from '../components/ui/date-input';
import { Select } from '../components/ui/select';
import { cn } from '../lib/cn';
import { useProjectChoices } from '../projects/useProjects';

// 기록 시각을 서울 기준으로 보여 줌
const timeText = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

// 대상으로 이동할 화면 (대상이 회사나 지워진 항목이면 이동하지 않음)
const targetPath = (item: AuditLog) =>
  item.targetType === 'EMPLOYEE'
    ? `/employees/${item.targetId}`
    : item.targetType === 'PROJECT'
      ? `/projects/${item.targetId}`
      : item.projectId
        ? `/projects/${item.projectId}/documents?doc=${item.targetId}`
        : null;

const KIND_TONE: Record<AuditKind, 'primary' | 'warning' | 'danger' | 'success' | 'neutral'> = {
  SAVE: 'success',
  UPDATE: 'primary',
  DELETE: 'danger',
  EXPORT: 'neutral',
  CONFIRM: 'warning',
  VIEW: 'neutral',
};

const Row = ({ item }: { item: AuditLog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const path = targetPath(item);
  const hasChanges = item.changes.length > 0;

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface-subtle px-5 py-4 text-sm">
      <div className="grid gap-1 md:grid-cols-[14rem_1fr_16rem] md:items-center md:gap-4">
        <span className="flex items-center gap-2 font-medium">
          <Badge tone={KIND_TONE[item.kind]}>{AUDIT_KIND_LABELS[item.kind]}</Badge>
          {AUDIT_ACTION_TITLES[item.action]}
        </span>
        <span>
          {item.targetName ? (
            path ? (
              <Link className="text-primary hover:text-sub" to={path}>
                {item.targetName}
              </Link>
            ) : (
              item.targetName
            )
          ) : (
            <span className="text-sub">(삭제되었거나 찾을 수 없는 대상)</span>
          )}
          {item.summary ? ` · ${item.summary}` : ''}
          {item.projectName && item.targetType !== 'PROJECT' && (
            <span className="ml-2 text-sub">({item.projectName})</span>
          )}
        </span>
        <span className="text-sub">
          {timeText(item.createdAt)} · {item.actorName}
        </span>
      </div>
      {hasChanges && (
        <>
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((value) => !value)}
            className="flex w-fit items-center gap-1 text-sm font-medium text-primary hover:text-sub"
          >
            바뀐 내용 {item.changes.length}건
            <ChevronDown
              aria-hidden
              className={cn('size-4 transition-transform', isOpen && 'rotate-180')}
            />
          </button>
          {isOpen && (
            <dl className="grid gap-x-4 gap-y-1.5 rounded-lg bg-surface p-3 sm:grid-cols-[8rem_1fr]">
              {item.changes.map((change) => (
                <div key={change.label} className="contents">
                  <dt className="font-medium">{change.label}</dt>
                  <dd className="text-foreground/80">
                    {change.before === null && change.after === null ? (
                      '바뀜 (값은 기록하지 않음)'
                    ) : (
                      <>
                        <span className="text-sub">{change.before ?? '(없음)'}</span>
                        {' → '}
                        <span className="font-medium text-foreground">
                          {change.after ?? '(없음)'}
                        </span>
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </li>
  );
};

// 설정 > 활동 기록: 데이터를 바꾼 일(저장·수정·삭제), 내보내기, 월 공수 확정·재오픈, 민감 자료 열람을 최근순으로 조회
// (문서), 조회 전용이며 수정·삭제 없음
export const AuditLogsPage = () => {
  const [kind, setKind] = useState<AuditKind | ''>('');
  const [projectId, setProjectId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const projects = useProjectChoices();
  const filter: AuditFilter = {
    ...(kind ? { kind } : {}),
    ...(projectId ? { projectId } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
  const dateError =
    from && to && from > to ? '끝 날짜는 시작 날짜보다 빠를 수 없습니다' : undefined;
  const logs = useAuditLogs(dateError ? {} : filter);
  const items = logs.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="활동 기록"
        description="누가 언제 무엇을 저장·수정·삭제·내보내기·확정·열람했는지 남은 기록입니다. 수정하거나 지울 수 없습니다"
        back={<BackLink to="/settings?tab=company">설정으로</BackLink>}
      />

      <div role="group" aria-label="종류로 거르기" className="flex flex-wrap gap-2">
        <Chip selected={kind === ''} onClick={() => setKind('')}>
          전체
        </Chip>
        {AUDIT_KINDS.map((value) => (
          <Chip
            key={value}
            selected={kind === value}
            onClick={() => setKind(kind === value ? '' : value)}
          >
            {AUDIT_KIND_LABELS[value]}
          </Chip>
        ))}
      </div>

      <form
        className="grid gap-3 rounded-3xl bg-surface-subtle p-5 md:grid-cols-3"
        aria-label="기록 거르기"
        onSubmit={(e) => e.preventDefault()}
      >
        <FormField label="프로젝트">
          <Select
            value={projectId}
            emptyLabel="모든 프로젝트"
            onValueChange={setProjectId}
            options={(projects.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
        </FormField>
        <FormField label="시작 날짜">
          <DateInput value={from} onChange={(event) => setFrom(event.target.value)} />
        </FormField>
        <FormField label="끝 날짜" error={dateError}>
          <DateInput value={to} onChange={(event) => setTo(event.target.value)} />
        </FormField>
      </form>

      {logs.isError && <Alert>기록을 불러오지 못했습니다</Alert>}
      {logs.isPending ? (
        <p className="text-sm">기록을 불러오는 중</p>
      ) : items.length === 0 ? (
        <EmptyState title="조건에 맞는 기록이 없습니다" />
      ) : (
        <ul className="flex flex-col gap-2" aria-label="기록 목록">
          {items.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ul>
      )}
      {logs.hasNextPage && (
        <Button
          type="button"
          variant="secondary"
          disabled={logs.isFetchingNextPage}
          onClick={() => void logs.fetchNextPage()}
        >
          {logs.isFetchingNextPage ? '불러오는 중' : '더 보기'}
        </Button>
      )}
    </div>
  );
};
