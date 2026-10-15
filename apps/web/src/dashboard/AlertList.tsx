import {
  dashboardAlertMessage,
  dashboardAlertPath,
  type AlertKind,
  type DashboardAlertItem,
} from '@field-note/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '../components/ui/button';
import { cn } from '../lib/cn';

// 같은 종류가 이 개수를 넘으면 한 줄로 묶어 보여 준다
export const ALERT_GROUP_THRESHOLD = 3;

const GROUP_TITLES: Record<AlertKind, string> = {
  NO_LOG_TODAY: '오늘 작업 내역이 없는 프로젝트',
  BURN_REACHED: '공수 소진율이 기준에 도달한 프로젝트',
  BURN_AHEAD: '진행률보다 공수가 빨리 소진되는 프로젝트',
  PROJECT_OVERDUE: '종료 예정일이 지난 프로젝트',
  DOUBLE_ASSIGNED: '같은 날 두 곳에서 일한 직원',
  CHANGE_STALE: '오래 협의 중인 변경 작업',
  WARRANTY_ENDING: '보증 종료가 다가오는 프로젝트',
  REPAIR_UNHANDLED: '처리하지 않은 보수 요청',
  CERTIFICATE_EXPIRING: '만료가 다가오는 보증서',
  CREDENTIAL_EXPIRING: '만료가 다가오는 직원 서류',
  MONTH_UNCLOSED: '확정하지 않은 월 공수',
};

type Entry =
  | { type: 'single'; item: DashboardAlertItem }
  | { type: 'group'; kind: AlertKind; items: DashboardAlertItem[] };

// 같은 종류가 많으면 묶는다 (급한 것이 먼저라는 순서는 첫 항목 위치로 유지)
const toEntries = (alerts: readonly DashboardAlertItem[]): Entry[] => {
  const counts = new Map<AlertKind, number>();

  for (const item of alerts) counts.set(item.alert.kind, (counts.get(item.alert.kind) ?? 0) + 1);

  const entries: Entry[] = [];
  const groups = new Map<AlertKind, Extract<Entry, { type: 'group' }>>();

  for (const item of alerts) {
    const kind = item.alert.kind;

    if ((counts.get(kind) ?? 0) <= ALERT_GROUP_THRESHOLD) {
      entries.push({ type: 'single', item });
      continue;
    }

    const group = groups.get(kind);

    if (group) {
      group.items.push(item);
    } else {
      const created = { type: 'group' as const, kind, items: [item] };

      groups.set(kind, created);
      entries.push(created);
    }
  }

  return entries;
};

type AlertRowProps = {
  item: DashboardAlertItem;
  today: string;
  onDismiss: (keys: string[]) => void;
  disabled: boolean;
};

const AlertRow = ({ item, today, onDismiss, disabled }: AlertRowProps) => (
  <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
    <span
      aria-hidden
      className={cn('size-2 shrink-0 rounded-full', item.urgent ? 'bg-danger' : 'bg-foreground/35')}
    />
    <p className={cn('min-w-0 flex-1 basis-56 text-sm', item.urgent && 'font-medium text-danger')}>
      {dashboardAlertMessage(item.alert)}
    </p>
    <span className="flex shrink-0 items-center gap-1">
      <Link
        to={dashboardAlertPath(item.alert, today)}
        aria-label={`${dashboardAlertMessage(item.alert)} 이동`}
        className="inline-flex min-h-touch items-center rounded-md px-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        이동
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label={`${dashboardAlertMessage(item.alert)} 숨기기`}
        onClick={() => onDismiss([item.key])}
      >
        숨기기
      </Button>
    </span>
  </li>
);

type AlertListProps = {
  alerts: readonly DashboardAlertItem[];
  today: string;
  onDismiss: (keys: string[]) => void;
  disabled?: boolean;
  // 묶지 않고 앞에서부터 이만큼만 보여 줄 때 (홈)
  limit?: number;
};

// 알림 목록: 급한 알림은 붉은 점·글자, 나머지는 회색 점. 같은 종류가 많으면 한 줄로 묶고, 하나씩 "이동" "숨기기"
export const AlertList = ({
  alerts,
  today,
  onDismiss,
  disabled = false,
  limit,
}: AlertListProps) => {
  const [opened, setOpened] = useState<ReadonlySet<AlertKind>>(new Set());
  const shown = limit === undefined ? alerts : alerts.slice(0, limit);
  const entries =
    limit === undefined
      ? toEntries(shown)
      : shown.map((item) => ({ type: 'single' as const, item }));

  return (
    <ul className="divide-y divide-line">
      {entries.map((entry) => {
        if (entry.type === 'single') {
          return (
            <AlertRow
              key={entry.item.key}
              item={entry.item}
              today={today}
              onDismiss={onDismiss}
              disabled={disabled}
            />
          );
        }

        const isOpen = opened.has(entry.kind);
        const hasUrgent = entry.items.some((item) => item.urgent);

        return (
          <li key={entry.kind} className="py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                aria-hidden
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  hasUrgent ? 'bg-danger' : 'bg-foreground/35',
                )}
              />
              <p
                className={cn(
                  'min-w-0 flex-1 basis-56 text-sm',
                  hasUrgent && 'font-medium text-danger',
                )}
              >
                {GROUP_TITLES[entry.kind]} {entry.items.length}건
              </p>
              <span className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-expanded={isOpen}
                  aria-label={`${GROUP_TITLES[entry.kind]} ${isOpen ? '접기' : '펼치기'}`}
                  onClick={() =>
                    setOpened((current) => {
                      const next = new Set(current);

                      if (!next.delete(entry.kind)) next.add(entry.kind);

                      return next;
                    })
                  }
                >
                  {isOpen ? '접기' : '펼치기'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  aria-label={`${GROUP_TITLES[entry.kind]} ${entry.items.length}건 숨기기`}
                  onClick={() => onDismiss(entry.items.map((item) => item.key))}
                >
                  숨기기
                </Button>
              </span>
            </div>
            {isOpen && (
              <ul className="mt-1 ml-5 divide-y divide-line border-l border-line pl-3">
                {entry.items.map((item) => (
                  <AlertRow
                    key={item.key}
                    item={item}
                    today={today}
                    onDismiss={onDismiss}
                    disabled={disabled}
                  />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
};
