import {
  PROJECT_STATUS_LABELS,
  PROJECT_WARNING_LABELS,
  dashboardAlertMessage,
  dashboardAlertPath,
  type Dashboard,
  type DashboardProject,
} from '@field-note/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { cn } from '../lib/cn';
import { projectWorkPath } from '../lib/projectPaths';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ProgressBar } from '../components/ui/progress-bar';

// 알림이 많을 때 처음에 보여 줄 개수 (나머지는 펼쳐서 본다)
const ALERTS_COLLAPSED = 5;

const card = 'flex flex-col gap-3 rounded-xl bg-surface-subtle p-5';

const Widget = ({
  title,
  id,
  className,
  children,
}: {
  title: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <section className={cn(card, className)} aria-labelledby={id}>
    <h2 id={id} className="text-lg font-bold">
      {title}
    </h2>
    {children}
  </section>
);

// 남은 일수 문구 (지났으면 "N일 지남")
const daysLabel = (daysLeft: number) =>
  daysLeft < 0 ? `${-daysLeft}일 지남` : daysLeft === 0 ? '오늘' : `${daysLeft}일 남음`;

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-foreground/70">{children}</p>
);

const ProjectRow = ({ project }: { project: DashboardProject }) => (
  <li>
    <Link
      to={`/projects/${project.id}`}
      className="flex min-h-touch flex-col justify-center gap-0.5 underline-offset-2 hover:underline"
    >
      <span className="font-medium">
        {project.code} {project.name}{' '}
        <span className="text-sm font-normal text-foreground/70">
          ({PROJECT_STATUS_LABELS[project.status]})
        </span>
      </span>
      <span className="text-sm text-foreground/70">
        진행률 {project.progressPercent === null ? '기록 없음' : `${project.progressPercent}%`} ·
        공수 소진율{' '}
        {project.burnPercent === null ? '계획 없음' : `${Math.round(project.burnPercent)}%`}
      </span>
      {project.progressPercent !== null && (
        <ProgressBar
          aria-label={`${project.name} 진행률`}
          value={project.progressPercent}
          className="mt-1"
        />
      )}
      {project.warnings.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {project.warnings.map((warning) => (
            <Badge key={warning} tone="danger">
              {PROJECT_WARNING_LABELS[warning]}
            </Badge>
          ))}
        </span>
      )}
    </Link>
  </li>
);

// 홈 대시보드 (서비스 기획서 §15.2): 알림, 오늘 투입, 위험 프로젝트, 진행 프로젝트, 이번 주 인력,
// 보증 종료 임박, 만료 임박(보증서·직원 서류), 할 일(임시 저장 작업 내역·방치 메모·월 공수 미확정)
export const DashboardWidgets = ({ dashboard }: { dashboard: Dashboard }) => {
  const {
    alerts,
    todayAssignments,
    projectCounts,
    activeProjects,
    risks,
    week,
    todos,
    warranty,
    expiring,
  } = dashboard;
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const shownAlerts = showAllAlerts ? alerts : alerts.slice(0, ALERTS_COLLAPSED);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Widget title="알림" id="alerts-heading" className="lg:col-span-2">
        {alerts.length === 0 ? (
          <Empty>지금 확인할 알림이 없습니다</Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {shownAlerts.map((alert, index) => (
              <li key={`${alert.kind}-${index}`}>
                <Link
                  to={dashboardAlertPath(alert)}
                  className="flex min-h-touch items-center rounded-md bg-danger-subtle px-3 py-2 text-danger"
                >
                  {dashboardAlertMessage(alert)}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {alerts.length > ALERTS_COLLAPSED && (
          <Button
            type="button"
            variant="secondary"
            aria-expanded={showAllAlerts}
            onClick={() => setShowAllAlerts((value) => !value)}
          >
            {showAllAlerts ? '알림 접기' : `알림 ${alerts.length - ALERTS_COLLAPSED}건 더 보기`}
          </Button>
        )}
        <Link
          to="/settings/alerts"
          className="min-h-touch content-center text-sm text-primary underline"
        >
          알림 설정
        </Link>
      </Widget>

      <Widget title="오늘의 투입" id="today-heading">
        {todayAssignments.projects.length === 0 ? (
          <Empty>오늘 투입된 프로젝트가 없습니다</Empty>
        ) : (
          <>
            <p className="text-sm">
              오늘 {todayAssignments.headcount}명이 {todayAssignments.projects.length}개 프로젝트에
              나갑니다
            </p>
            <ul className="flex flex-col gap-1">
              {todayAssignments.projects.map((item) => (
                <li key={item.projectId}>
                  <Link
                    to={projectWorkPath(item.projectId, dashboard.today)}
                    className="flex min-h-touch items-center justify-between gap-2 underline-offset-2 hover:underline"
                  >
                    <span>
                      {item.code} {item.name} · {item.headcount}명
                    </span>
                    <span className={item.hasLog ? 'text-sm' : 'text-sm font-medium text-danger'}>
                      {item.hasLog ? '작업 내역 입력함' : '작업 내역 없음'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Widget>

      <Widget title="위험 프로젝트" id="risk-heading">
        {risks.length === 0 ? (
          <Empty>공수 소진이나 일정이 걱정되는 프로젝트가 없습니다</Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {risks.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        )}
      </Widget>

      <Widget title="진행 프로젝트" id="projects-heading">
        <p className="text-sm">
          진행 {projectCounts.inProgress}건 · 예정 {projectCounts.planned}건 · 중단{' '}
          {projectCounts.suspended}건
        </p>
        {activeProjects.length === 0 ? (
          <Empty>진행·예정·중단 중인 프로젝트가 없습니다</Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {activeProjects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        )}
      </Widget>

      <Widget title="이번 주 인력" id="week-heading">
        <p className="text-sm text-foreground/70">
          {week.from} ~ {week.to}
        </p>
        <p className="text-sm">
          {week.conflicts.length === 0
            ? '같은 날 겹친 배치가 없습니다'
            : `같은 날 겹친 배치: ${week.conflicts.map((item) => `${item.name} ${item.dateCount}일`).join(', ')}`}
        </p>
        <p className="text-sm">
          {week.freeCount === 0
            ? '이번 주 내내 비는 사람이 없습니다'
            : `이번 주 비는 사람 ${week.freeCount}명 (${week.freeNames.join(', ')}${week.freeCount > week.freeNames.length ? ' 등' : ''})`}
        </p>
        <Link to="/staffing" className="min-h-touch content-center text-sm text-primary underline">
          인력 배치 보기
        </Link>
      </Widget>

      <Widget title="보증 종료 임박" id="warranty-heading">
        <p className="text-sm">처리하지 않은 보수 요청 {warranty.openRepairCount}건</p>
        {warranty.ending.length === 0 ? (
          <Empty>60일 안에 보증이 끝나는 프로젝트가 없습니다</Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {warranty.ending.map((item) => (
              <li key={item.projectId}>
                <Link
                  to={`/projects/${item.projectId}/warranty`}
                  className="flex min-h-touch items-center justify-between gap-2 underline-offset-2 hover:underline"
                >
                  <span>
                    {item.code} {item.name}
                  </span>
                  <span
                    className={item.daysLeft <= 7 ? 'text-sm font-medium text-danger' : 'text-sm'}
                  >
                    {daysLabel(item.daysLeft)} ({item.endOn})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Widget>

      <Widget title="만료 임박" id="expiring-heading">
        {expiring.certificates.length === 0 && expiring.credentials.length === 0 ? (
          <Empty>30일 안에 만료되는 보증서·직원 서류가 없습니다</Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {expiring.certificates.map((item, index) => (
              <li key={`certificate-${index}`}>
                <Link
                  to={`/projects/${item.projectId}/warranty`}
                  className="flex min-h-touch items-center justify-between gap-2 underline-offset-2 hover:underline"
                >
                  <span>
                    보증서 {item.title} · {item.projectName}
                  </span>
                  <span
                    className={item.daysLeft < 0 ? 'text-sm font-medium text-danger' : 'text-sm'}
                  >
                    {daysLabel(item.daysLeft)} ({item.expiresOn})
                  </span>
                </Link>
              </li>
            ))}
            {expiring.credentials.map((item, index) => (
              <li key={`credential-${index}`}>
                <Link
                  to={`/employees/${item.employeeId}`}
                  className="flex min-h-touch items-center justify-between gap-2 underline-offset-2 hover:underline"
                >
                  <span>
                    {item.employeeName} · {item.typeName}
                  </span>
                  <span
                    className={item.daysLeft < 0 ? 'text-sm font-medium text-danger' : 'text-sm'}
                  >
                    {daysLabel(item.daysLeft)} ({item.expiresOn})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Widget>

      <Widget title="할 일" id="todo-heading">
        <ul className="flex flex-col gap-1 text-sm">
          <li>임시 저장된 작업 내역 {todos.draftLogCount}건</li>
          <li>3일 넘게 쌓인 메모 {todos.staleInboxCount}건</li>
          <li>
            {todos.unclosedMonth ? (
              <Link
                to={`/monthly-hours?month=${todos.unclosedMonth}`}
                className="flex min-h-touch items-center text-primary underline"
              >
                {todos.unclosedMonth} 월 공수 확정 전
              </Link>
            ) : (
              '확정하지 않은 지난달 월 공수 없음'
            )}
          </li>
        </ul>
      </Widget>
    </div>
  );
};
