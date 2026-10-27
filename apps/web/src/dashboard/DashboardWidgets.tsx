import { minutesToManDays, roundTo, type Dashboard } from '@field-note/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { StatGroup } from '../components/ui/stat-group';
import { cn } from '../lib/cn';
import { useCompanySettings } from '../settings/useCompanySettings';

import { AlertList } from './AlertList';
import { useDismissAlerts } from './useDashboard';

// 홈에서 알림은 위에서 이 개수만큼만 표시하고 나머지는 알림 창에서 확인
export const HOME_ALERTS = 5;

// 하루 기준시간 설정을 아직 못 받았을 때 쓰는 값
const FALLBACK_STANDARD_MINUTES = 480;

const card = 'flex min-h-0 flex-col gap-5 rounded-[32px] bg-surface-subtle p-8';

type WidgetProps = {
  title: string;
  id: string;
  action?: ReactNode;
  // 제목 줄 오른쪽에 놓는 개수 글자
  count?: ReactNode;
  // 높이가 정해진 칸에서 목록만 안에서 스크롤
  isScrollable?: boolean;
  children: ReactNode;
};

const Widget = ({ title, id, action, count, isScrollable = false, children }: WidgetProps) => (
  <section className={cn(card)} aria-labelledby={id}>
    <div className="flex flex-none items-center justify-between gap-3">
      <h2 id={id} className="text-[24px] font-extrabold tracking-[-0.025em]">
        {title}
      </h2>
      <div className="flex items-center gap-4">
        {count !== undefined && (
          <span className="font-emphasis text-sm font-bold text-sub">{count}</span>
        )}
        {action}
      </div>
    </div>
    {isScrollable ? (
      <div className="-mr-2 flex max-h-96 min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2 lg:max-h-none">
        {children}
      </div>
    ) : (
      children
    )}
  </section>
);

const TextLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    className="inline-flex min-h-touch items-center text-sm font-semibold hover:text-sub"
  >
    {children}
  </Link>
);

// 남은 일수 문구 (지났으면 "N일 지남")
const daysLabel = (daysLeft: number) =>
  daysLeft < 0 ? `${-daysLeft}일 지남` : daysLeft === 0 ? '오늘' : `${daysLeft}일 남음`;

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-sub">{children}</p>
);

// 오늘 투입 인원을 어제와 견준 문구
const headcountHint = (today: number, yesterday: number) => {
  const diff = today - yesterday;

  return diff === 0
    ? '어제와 같아요'
    : `어제보다 ${Math.abs(diff)}명 ${diff > 0 ? '많아요' : '적어요'}`;
};

const DueRow = ({
  to,
  label,
  due,
  urgent,
}: {
  to: string;
  label: string;
  due: string;
  urgent: boolean;
}) => (
  <li>
    <Link to={to} className="flex min-h-touch items-center justify-between gap-2 hover:text-sub">
      <span>{label}</span>
      <span className={urgent ? 'text-sm font-medium text-danger' : 'text-sm'}>{due}</span>
    </Link>
  </li>
);

// 홈 대시보드: 수치 타일, 확인할 일(알림)과 이번 달 인력 달력(monthSlot), 보증·만료 임박 줄
export const DashboardWidgets = ({
  dashboard,
  monthSlot,
}: {
  dashboard: Dashboard;
  monthSlot?: ReactNode;
}) => {
  const { alerts, stats, activeProjects, todayAssignments, warranty, expiring, todos, today } =
    dashboard;
  const dismiss = useDismissAlerts();
  const settings = useCompanySettings();
  const standardMinutes = settings.data?.standardWorkMinutes ?? FALLBACK_STANDARD_MINUTES;
  const needLogCount = todayAssignments.projects.filter((project) => !project.hasLog).length;
  const warningCount = activeProjects.filter(
    (project) => project.status === 'IN_PROGRESS' && project.warnings.length > 0,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <StatGroup
        className="relative -mt-12 md:-mt-[92px]"
        items={[
          {
            label: '오늘 투입',
            value: stats.todayHeadcount,
            unit: '명',
            hint: headcountHint(stats.todayHeadcount, stats.yesterdayHeadcount),
            surface: 'lime',
          },
          {
            label: '오늘 기록 필요',
            value: needLogCount,
            unit: '건',
            hint: '작업일지 미작성 프로젝트',
            tone: needLogCount > 0 ? 'warning' : 'default',
            surface: 'cream',
          },
          {
            label: '진행 중 프로젝트',
            value: stats.inProgress,
            unit: '개',
            hint: warningCount > 0 ? `경고 ${warningCount}건 포함` : '경고 없음',
            surface: 'cream',
          },
          {
            label: '이번 달 공수',
            value: roundTo(minutesToManDays(stats.monthMinutes, standardMinutes), 1),
            unit: 'MD',
            hint: `월 기준 ${settings.data?.monthlyWorkDays ?? '-'}일 · ${
              dashboard.month.isClosed ? '확정' : '확정 전'
            }`,
            surface: 'ink',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Widget
          title="확인할 일"
          id="alerts-heading"
          isScrollable
          count={`${alerts.length}건`}
          action={<TextLink to="/settings/alerts">알림 설정</TextLink>}
        >
          {alerts.length === 0 ? (
            <Empty>
              지금 확인할 알림이 없습니다
              {dashboard.hiddenAlertCount > 0 && ` (숨긴 알림 ${dashboard.hiddenAlertCount}건)`}
            </Empty>
          ) : (
            <AlertList
              alerts={alerts}
              today={today}
              limit={HOME_ALERTS}
              disabled={dismiss.isPending}
              onDismiss={(keys) => dismiss.mutate(keys)}
            />
          )}
          {todos.draftLogCount > 0 && (
            <p className="text-sm text-sub">임시 저장 작업 내역 {todos.draftLogCount}건</p>
          )}
          {alerts.length > HOME_ALERTS && (
            <p className="text-sm text-sub">
              알림 {alerts.length - HOME_ALERTS}건이 더 있습니다. 메뉴의 알림 버튼에서 모두 볼 수
              있습니다
            </p>
          )}
        </Widget>

        {monthSlot}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Widget title="보증 종료 임박" id="warranty-heading">
          <p className="text-sm">처리하지 않은 보수 요청 {warranty.openRepairCount}건</p>
          {warranty.ending.length === 0 ? (
            <Empty>60일 안에 보증이 끝나는 프로젝트가 없습니다</Empty>
          ) : (
            <ul className="flex flex-col">
              {warranty.ending.map((item) => (
                <DueRow
                  key={item.projectId}
                  to={`/projects/${item.projectId}/warranty`}
                  label={`${item.code} ${item.name}`}
                  due={`${daysLabel(item.daysLeft)} (${item.endOn})`}
                  urgent={item.daysLeft <= 7}
                />
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="만료 임박" id="expiring-heading">
          {expiring.certificates.length === 0 && expiring.credentials.length === 0 ? (
            <Empty>30일 안에 만료되는 보증서·직원 서류가 없습니다</Empty>
          ) : (
            <ul className="flex flex-col">
              {expiring.certificates.map((item, index) => (
                <DueRow
                  key={`certificate-${index}`}
                  to={`/projects/${item.projectId}/warranty`}
                  label={`보증서 ${item.title}, ${item.projectName}`}
                  due={`${daysLabel(item.daysLeft)} (${item.expiresOn})`}
                  urgent={item.daysLeft < 0}
                />
              ))}
              {expiring.credentials.map((item, index) => (
                <DueRow
                  key={`credential-${index}`}
                  to={`/employees/${item.employeeId}?tab=credentials`}
                  label={`${item.employeeName}, ${item.typeName}`}
                  due={`${daysLabel(item.daysLeft)} (${item.expiresOn})`}
                  urgent={item.daysLeft < 0}
                />
              ))}
            </ul>
          )}
        </Widget>
      </div>
    </div>
  );
};
