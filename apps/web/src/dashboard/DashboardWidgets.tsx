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

import { Button } from '../components/ui/button';

// 알림이 많을 때 처음에 보여 줄 개수 (나머지는 펼쳐서 본다)
const ALERTS_COLLAPSED = 5;

const card = 'flex flex-col gap-2 rounded-md border border-border p-4';

const Widget = ({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) => (
  <section className={card} aria-labelledby={id}>
    <h2 id={id} className="text-lg font-bold">
      {title}
    </h2>
    {children}
  </section>
);

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
      {project.warnings.length > 0 && (
        <span className="text-sm font-medium text-danger">
          {project.warnings.map((warning) => PROJECT_WARNING_LABELS[warning]).join(' · ')}
        </span>
      )}
    </Link>
  </li>
);

// 홈 대시보드 (서비스 기획서 §15.2): 알림, 오늘 투입, 위험 프로젝트, 진행 프로젝트, 이번 주 인력, 할 일.
// 보증 종료 임박·만료 임박·월 공수 미확정은 해당 기능이 생기는 4단계에서 추가한다
export const DashboardWidgets = ({ dashboard }: { dashboard: Dashboard }) => {
  const { alerts, todayAssignments, projectCounts, activeProjects, risks, week, todos } = dashboard;
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const shownAlerts = showAllAlerts ? alerts : alerts.slice(0, ALERTS_COLLAPSED);

  return (
    <div className="flex flex-col gap-4">
      <Widget title="알림" id="alerts-heading">
        {alerts.length === 0 ? (
          <Empty>지금 확인할 알림이 없습니다</Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {shownAlerts.map((alert, index) => (
              <li key={`${alert.kind}-${index}`}>
                <Link
                  to={dashboardAlertPath(alert)}
                  className="flex min-h-touch items-center rounded-md bg-danger/10 px-3 py-2 text-danger"
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
                    to={`/work-logs?project=${item.projectId}`}
                    className="flex min-h-touch items-center justify-between gap-2 underline-offset-2 hover:underline"
                  >
                    <span>
                      {item.code} {item.name} · {item.headcount}명
                    </span>
                    <span className={item.hasLog ? 'text-sm' : 'text-sm font-medium text-danger'}>
                      {item.hasLog ? '일지 입력함' : '일지 없음'}
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

      <Widget title="할 일" id="todo-heading">
        <ul className="flex flex-col gap-1 text-sm">
          <li>임시 저장된 작업일지 {todos.draftLogCount}건</li>
          <li>3일 넘게 쌓인 메모 {todos.staleInboxCount}건</li>
        </ul>
      </Widget>
    </div>
  );
};
