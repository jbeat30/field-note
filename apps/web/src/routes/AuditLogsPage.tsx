import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_TITLES,
  auditActionSchema,
  type AuditLog,
} from '@field-note/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { BackLink } from '../components/ui/back-link';
import { useAuditLogs, type AuditFilter } from '../audit/useAuditLogs';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { DateInput } from '../components/ui/date-input';
import { Select } from '../components/ui/select';

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
      : null;

const Row = ({ item }: { item: AuditLog }) => {
  const path = targetPath(item);

  return (
    <li className="flex flex-col gap-0.5 rounded-xl bg-surface-subtle p-4 text-sm">
      <span className="font-medium">{AUDIT_ACTION_TITLES[item.action]}</span>
      <span>
        {item.targetName ? (
          path ? (
            <Link className="text-primary underline" to={path}>
              {item.targetName}
            </Link>
          ) : (
            item.targetName
          )
        ) : (
          <span className="text-foreground/70">(삭제되었거나 찾을 수 없는 대상)</span>
        )}
        {item.summary ? ` · ${item.summary}` : ''}
      </span>
      <span className="text-foreground/70">
        {timeText(item.createdAt)} · {item.actorName}
      </span>
    </li>
  );
};

// 설정 > 기록 조회: 감사 기록을 최근순으로 본다 (서비스 기획서 §13.1). 조회만 하고 수정·삭제는 없다
export const AuditLogsPage = () => {
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const parsedAction = auditActionSchema.safeParse(action);
  const filter: AuditFilter = {
    ...(parsedAction.success ? { action: parsedAction.data } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
  const dateError =
    from && to && from > to ? '끝 날짜는 시작 날짜보다 빠를 수 없습니다' : undefined;
  const logs = useAuditLogs(dateError ? {} : filter);
  const items = logs.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <BackLink to="/settings">설정으로</BackLink>
        <h1 className="text-2xl font-bold">기록 조회</h1>
        <p className="text-sm text-foreground/70">
          누가 언제 무엇을 열람·내보내기·확정했는지 남은 기록입니다. 수정하거나 지울 수 없습니다
        </p>
      </div>

      <form
        className="flex flex-col gap-3"
        aria-label="기록 거르기"
        onSubmit={(e) => e.preventDefault()}
      >
        <FormField label="종류">
          <Select value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="">전체</option>
            {AUDIT_ACTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {AUDIT_ACTION_TITLES[kind]}
              </option>
            ))}
          </Select>
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
        <p className="text-sm text-foreground/70">조건에 맞는 기록이 없습니다</p>
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
