import {
  dashboardAlertMessage,
  dashboardAlertPath,
  type AlertKind,
  type DashboardAlertItem,
} from '@field-note/shared';
import { AlertCircle, BarChart3, Check, FileText, type LucideIcon } from 'lucide-react';
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
  // 알림 창 안에서는 이동과 숨기기를 굵은 글자 버튼으로 보임
  isModal?: boolean;
};

// 줄 오른쪽의 "숨기기" 같은 글자 버튼: 바탕 없이 보조 글자색
const textButtonClass =
  'text-[13px] font-semibold text-sub hover:text-foreground disabled:opacity-50';

// 홈 확인할 일 줄의 아이콘 칸: 종류마다 고정된 아이콘과 색 (시안 기준, 급함 여부로 색을 바꾸지 않음)
const ROW_ICONS: Record<AlertKind, { icon: LucideIcon; tone: string }> = {
  NO_LOG_TODAY: { icon: FileText, tone: 'bg-accent-subtle text-[#7a2f0e]' },
  BURN_REACHED: { icon: BarChart3, tone: 'bg-warning-subtle text-warning' },
  BURN_AHEAD: { icon: BarChart3, tone: 'bg-warning-subtle text-warning' },
  PROJECT_OVERDUE: { icon: AlertCircle, tone: 'bg-danger-subtle text-danger' },
  DOUBLE_ASSIGNED: { icon: AlertCircle, tone: 'bg-danger-subtle text-danger' },
  CHANGE_STALE: { icon: FileText, tone: 'bg-accent-subtle text-[#7a2f0e]' },
  WARRANTY_ENDING: { icon: Check, tone: 'bg-success-subtle text-success' },
  REPAIR_UNHANDLED: { icon: FileText, tone: 'bg-accent-subtle text-[#7a2f0e]' },
  CERTIFICATE_EXPIRING: { icon: Check, tone: 'bg-success-subtle text-success' },
  CREDENTIAL_EXPIRING: { icon: Check, tone: 'bg-success-subtle text-success' },
  MONTH_UNCLOSED: { icon: FileText, tone: 'bg-accent-subtle text-[#7a2f0e]' },
};

const DOT_URGENT = 'bg-danger';
const DOT_NORMAL = 'bg-[#8d826c]';

const AlertRow = ({
  item,
  today,
  onDismiss,
  disabled,
  isInGroup = false,
  isModal = false,
}: AlertRowProps) => {
  // 홈의 단독 줄은 시안의 확인할 일 모양: 아이콘 칸, 제목과 설명 두 줄, 잉크 이동 버튼
  if (!isInGroup && !isModal) {
    const message = dashboardAlertMessage(item.alert);
    const split = message.indexOf(': ');
    const title = split > 0 ? message.slice(0, split) : message;
    const detail = split > 0 ? message.slice(split + 2) : null;
    const { icon: Icon, tone } = ROW_ICONS[item.alert.kind];

    return (
      <li className="flex items-center gap-4 rounded-[20px] bg-surface-nested px-5 py-4">
        <span
          aria-hidden
          className={cn('flex size-10 shrink-0 items-center justify-center rounded-[14px]', tone)}
        >
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="text-base">{title}</b>
          {detail && <span className="text-sm font-medium text-sub">{detail}</span>}
        </div>
        <Link
          to={dashboardAlertPath(item.alert, today)}
          aria-label={`${message} 이동`}
          className="inline-flex h-11 shrink-0 items-center rounded-full bg-primary px-[18px] text-sm font-bold text-primary-foreground hover:opacity-85"
        >
          이동
        </Link>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${message} 숨기기`}
          className={cn('shrink-0', textButtonClass)}
          onClick={() => onDismiss([item.key])}
        >
          숨기기
        </button>
      </li>
    );
  }

  return (
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
        className={cn(
          'shrink-0 text-[13px] font-bold',
          !isModal &&
            'rounded-2xl bg-primary px-3.5 py-[7px] text-primary-foreground hover:opacity-85',
        )}
      >
        이동
      </Link>
      <button
        type="button"
        disabled={disabled}
        aria-label={`${dashboardAlertMessage(item.alert)} 숨기기`}
        className={cn('shrink-0', textButtonClass, isModal && 'font-bold text-foreground')}
        onClick={() => onDismiss([item.key])}
      >
        숨기기
      </button>
    </li>
  );
};

type AlertListProps = {
  alerts: readonly DashboardAlertItem[];
  today: string;
  onDismiss: (keys: string[]) => void;
  disabled?: boolean;
  // 묶지 않고 앞에서부터 이만큼만 보여 줄 때 (홈)
  limit?: number;
  // 알림 창에서 쓸 때
  isModal?: boolean;
};

// 알림 목록: 급한 알림은 붉은 점·글자, 나머지는 회색 점, 같은 종류가 많으면 한 줄로 묶고 하나씩 "이동" "숨기기"
export const AlertList = ({
  alerts,
  today,
  onDismiss,
  disabled = false,
  limit,
  isModal = false,
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
              isModal={isModal}
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
