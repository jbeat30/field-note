import {
  dashboardAlertMessage,
  dashboardAlertPath,
  type AlertKind,
  type DashboardAlertItem,
} from '@field-note/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { cn } from '../lib/cn';

// 같은 종류가 이 개수를 넘으면 한 줄로 묶어 표시
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

// 같은 종류가 많으면 묶음 (급한 것이 먼저라는 순서는 첫 항목 위치로 유지)
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
  // 묶음 안의 줄은 바깥 묶음 면 위에 그대로 놓임
  isInGroup?: boolean;
};

// 줄 오른쪽의 "숨기기" 같은 글자 버튼: 바탕 없이 보조 글자색
const textButtonClass =
  'text-[13px] font-semibold text-foreground/65 hover:text-foreground disabled:opacity-50';

const DOT_URGENT = 'bg-danger';
const DOT_NORMAL = 'bg-[#8d826c]';

const AlertRow = ({ item, today, onDismiss, disabled, isInGroup = false }: AlertRowProps) => (
  <li
    className={cn(
      'flex items-center gap-3 text-sm leading-normal',
      isInGroup ? 'py-2' : 'rounded-[20px] bg-surface-nested py-[13px] pr-3.5 pl-4',
    )}
  >
    <span
      aria-hidden
      className={cn('size-2.5 shrink-0 rounded-full', item.urgent ? DOT_URGENT : DOT_NORMAL)}
    />
    <p className={cn('min-w-0 flex-1', item.urgent ? 'font-bold text-danger' : 'font-medium')}>
      {dashboardAlertMessage(item.alert)}
    </p>
    <Link
      to={dashboardAlertPath(item.alert, today)}
      aria-label={`${dashboardAlertMessage(item.alert)} 이동`}
      className="shrink-0 rounded-2xl bg-primary px-3.5 py-[7px] text-[13px] font-bold text-primary-foreground hover:opacity-85"
    >
      이동
    </Link>
    <button
      type="button"
      disabled={disabled}
      aria-label={`${dashboardAlertMessage(item.alert)} 숨기기`}
      className={cn('shrink-0', textButtonClass)}
      onClick={() => onDismiss([item.key])}
    >
      숨기기
    </button>
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

// 알림 목록: 급한 알림은 붉은 점·글자, 나머지는 회색 점, 같은 종류가 많으면 한 줄로 묶고 하나씩 "이동" "숨기기"
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
    <ul className="flex flex-col gap-2">
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
          <li key={entry.kind} className="rounded-2xl bg-surface-nested px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                aria-hidden
                className={cn('size-2 shrink-0 rounded-full', hasUrgent ? DOT_URGENT : DOT_NORMAL)}
              />
              <p
                className={cn(
                  'min-w-0 flex-1 text-sm',
                  hasUrgent ? 'font-bold text-danger' : 'font-medium',
                )}
              >
                {GROUP_TITLES[entry.kind]} {entry.items.length}건
              </p>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className={textButtonClass}
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
                </button>
                <button
                  type="button"
                  className={textButtonClass}
                  disabled={disabled}
                  aria-label={`${GROUP_TITLES[entry.kind]} ${entry.items.length}건 숨기기`}
                  onClick={() => onDismiss(entry.items.map((item) => item.key))}
                >
                  숨기기
                </button>
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
                    isInGroup
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
