import {
  PROJECT_STATUS_LABELS,
  PROJECT_WARNING_LABELS,
  type Dashboard,
  type DashboardProject,
} from '@field-note/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Badge } from '../components/ui/badge';
import { ProgressBar } from '../components/ui/progress-bar';
import { StatGroup } from '../components/ui/stat-group';
import { cn } from '../lib/cn';
import { projectWorkPath } from '../lib/projectPaths';

import { AlertList } from './AlertList';
import { useDismissAlerts } from './useDashboard';

// 홈에서 알림은 위에서 이 개수만큼만 표시하고 나머지는 알림 창에서 확인
export const HOME_ALERTS = 5;

const card = 'flex min-h-0 flex-col gap-3 rounded-[34px] bg-surface-subtle px-[30px] py-[26px]';

type WidgetProps = {
  title: string;
  id: string;
  action?: ReactNode;
  // 제목 옆 주황 개수 표시
  count?: number;
  // 높이가 정해진 칸에서 목록만 안에서 스크롤
  isScrollable?: boolean;
  children: ReactNode;
};

const Widget = ({ title, id, action, count, isScrollable = false, children }: WidgetProps) => (
  <section className={cn(card)} aria-labelledby={id}>
    <div className="flex flex-none items-baseline justify-between gap-2">
      <h2 id={id} className="text-[21px] font-bold tracking-[-0.025em]">
        {title}
        {count !== undefined && (
          <span
            aria-hidden
            className="ml-2 rounded-xl bg-accent px-[9px] align-[2px] font-emphasis text-[15px] font-semibold text-[#14110d]"
          >
            {count}
          </span>
        )}
      </h2>
      {action}
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

const hoursText = (minutes: number) => `${Math.round(minutes / 6) / 10}`;

// 종료 예정일까지 남은 날 (지났으면 음수)
const remainingDays = (today: string, plannedEnd: string) =>
  Math.round(
    (Date.parse(`${plannedEnd}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );

const HEAD_CELL =
  'sticky top-0 z-10 bg-surface py-2 pr-3 text-left text-xs font-semibold whitespace-nowrap text-sub shadow-[inset_0_-1.5px_0_var(--foreground)]';

// 표 머리는 고정하고 행만 스크롤, 오늘 기록은 잉크 알약 버튼
const ProjectTable = ({ projects, today }: { projects: DashboardProject[]; today: string }) => (
  <table className="w-full min-w-[34rem] text-[15px]">
    <caption className="sr-only">진행 중 프로젝트</caption>
    <thead>
      <tr>
        <th scope="col" className={HEAD_CELL}>
          프로젝트
        </th>
        <th scope="col" className={cn(HEAD_CELL, 'w-36')}>
          진행률
        </th>
        <th scope="col" className={HEAD_CELL}>
          남은 기간
        </th>
        <th scope="col" className={HEAD_CELL}>
          오늘 기록
        </th>
        <th scope="col" className={cn(HEAD_CELL, 'pr-0 text-right')}>
          이번 달
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-line">
      {projects.map((project) => {
        const days = remainingDays(today, project.plannedEnd);
        const inProgress = project.status === 'IN_PROGRESS';

        return (
          <tr key={project.id}>
            <td className="py-[15px] pr-3 align-middle">
              <Link
                to={`/projects/${project.id}`}
                className="text-[15.5px] font-bold hover:text-sub"
              >
                {project.name}
              </Link>
              <span className="mt-0.5 block text-[13px] text-sub">
                {project.siteName}
                {!inProgress && `, ${PROJECT_STATUS_LABELS[project.status]}`}
              </span>
              {project.warnings.length > 0 && (
                <span className="mt-1 flex flex-wrap gap-1">
                  {project.warnings.map((warning) => (
                    <Badge key={warning} tone="danger">
                      {PROJECT_WARNING_LABELS[warning]}
                    </Badge>
                  ))}
                </span>
              )}
            </td>
            <td className="py-[15px] pr-3 align-middle">
              {project.progressPercent === null ? (
                <span className="font-bold">기록 없음</span>
              ) : (
                <span className="flex flex-col">
                  <span className="font-bold tabular-nums">{project.progressPercent}%</span>
                  <ProgressBar
                    aria-label={`${project.name} 진행률`}
                    value={project.progressPercent}
                    className="mt-1.5 h-1.5"
                  />
                </span>
              )}
            </td>
            <td
              className={cn(
                'py-[15px] pr-3 align-middle whitespace-nowrap',
                days < 0 && 'font-bold text-danger',
              )}
            >
              {daysLabel(days)}
            </td>
            <td className="py-[15px] pr-3 align-middle whitespace-nowrap">
              {!inProgress ? (
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-field text-[13px] font-bold text-sub">
                  -
                </span>
              ) : project.hasLogToday ? (
                <span className="text-[13px] font-bold">기록함</span>
              ) : (
                <Link
                  to={projectWorkPath(project.id, today)}
                  aria-label={`${project.name} 오늘 기록하기`}
                  className="inline-flex items-center rounded-full bg-primary px-3.5 py-[7px] text-[13px] font-bold text-primary-foreground hover:opacity-85"
                >
                  기록하기
                </Link>
              )}
            </td>
            <td className="py-[15px] text-right align-middle whitespace-nowrap">
              <span className="font-emphasis text-[15px] font-semibold tabular-nums">
                {hoursText(project.monthMinutes)}
              </span>
              <span className="text-[13px] font-semibold"> 시간</span>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

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

// 홈 대시보드: 수치 줄, 진행 중 프로젝트 표 + 확인할 일(알림), 이번 달 인력(monthSlot), 보증·만료 임박 줄
export const DashboardWidgets = ({
  dashboard,
  monthSlot,
}: {
  dashboard: Dashboard;
  monthSlot?: ReactNode;
}) => {
  const { alerts, stats, activeProjects, warranty, expiring, todos, today } = dashboard;
  const dismiss = useDismissAlerts();

  return (
    <div className="flex flex-col gap-4">
      <StatGroup
        className="relative -mt-12 md:-mt-16"
        items={[
          { label: '진행 중 프로젝트', value: stats.inProgress, unit: '건' },
          {
            label: '오늘 기록한 인원',
            value: `${stats.todayLoggedHeadcount} / ${stats.todayHeadcount}`,
            unit: '명',
            hint: stats.todayHeadcount === 0 ? '오늘 나가는 사람 없음' : '기록 / 오늘 투입',
            tone: stats.todayHeadcount > stats.todayLoggedHeadcount ? 'warning' : 'default',
          },
          { label: '이번 달 일한 시간', value: hoursText(stats.monthMinutes), unit: '시간' },
          {
            label: '확인할 일',
            value: alerts.length,
            unit: '건',
            hint:
              todos.draftLogCount > 0 ? `임시 저장 작업 내역 ${todos.draftLogCount}건` : undefined,
            tone: alerts.some((item) => item.urgent) ? 'danger' : 'default',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:h-[420px] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Widget
          title="진행 중 프로젝트"
          id="projects-heading"
          isScrollable
          action={<TextLink to="/projects">모두 보기</TextLink>}
        >
          {activeProjects.length === 0 ? (
            <Empty>진행·예정·중단 중인 프로젝트가 없습니다</Empty>
          ) : (
            <ProjectTable projects={activeProjects} today={today} />
          )}
        </Widget>

        <Widget
          title="확인할 일"
          id="alerts-heading"
          isScrollable
          count={alerts.length}
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
          {alerts.length > HOME_ALERTS && (
            <p className="text-sm text-sub">
              알림 {alerts.length - HOME_ALERTS}건이 더 있습니다. 메뉴의 알림 버튼에서 모두 볼 수
              있습니다
            </p>
          )}
        </Widget>
      </div>

      {monthSlot}

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
