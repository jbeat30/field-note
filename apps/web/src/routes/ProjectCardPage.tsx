import { todayInSeoul, type ProjectDetail } from '@field-note/shared';
import { Camera, ClipboardPen, NotebookPen, Package } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { projectWorkPath } from '../lib/projectPaths';
import { useEmployees } from '../employees/useEmployees';
import { RequiredCredentialsPanel } from '../credentials/RequiredCredentialsPanel';
import { ProjectAssignmentsPanel } from '../projects/ProjectAssignmentsPanel';
import { ProjectForm } from '../projects/ProjectForm';
import { ProjectKpis } from '../projects/ProjectKpis';
import { ProjectPeriodHistory } from '../projects/ProjectPeriodHistory';
import { ProjectLaborCostPanel } from '../labor/ProjectLaborCostPanel';
import { usePartners } from '../partners/usePartners';
import { ProjectProgressPanel } from '../progress/ProjectProgressPanel';
import { useOptions } from '../settings/useOptions';
import { ProjectStatusPanel } from '../projects/ProjectStatusPanel';
import { useProject } from '../projects/useProjects';
import { ProjectWorkerTable } from '../workSummary/ProjectWorkerTable';
import { ProjectWorkSummaryPanel } from '../workSummary/ProjectWorkSummaryPanel';

// 프로젝트 작업 공간의 메뉴별 화면: 개요 · 투입 · 공수·비용 · 정보 (머리·메뉴는 ProjectLayout이 맡는다)
// 한 화면이 너무 길어지지 않게 관리 영역을 메뉴로 나눈다. section='all'은 시험·화면 확인용으로 모든 구역을 한 화면에 그린다

const InfoRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[5.5rem_1fr] gap-2 text-sm">
    <dt className="text-foreground/70">{label}</dt>
    <dd className="min-w-0 break-words">{children}</dd>
  </div>
);

// 프로젝트 정보 한눈에 보기 (읽기 전용 요약, 수정은 아래 기본정보 수정)
const ProjectInfoSummary = ({ project }: { project: ProjectDetail }) => {
  const partners = usePartners({});
  const employees = useEmployees({});
  const options = useOptions();
  const trades = project.tradeIds
    .map((id) => options.data?.find((item) => item.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <section className="flex flex-col gap-3" aria-labelledby="info-summary-heading">
      <h2 id="info-summary-heading" className="text-lg font-bold">
        프로젝트 정보
      </h2>
      <dl className="flex flex-col gap-2.5">
        <InfoRow label="고객">
          {partners.data?.find((item) => item.id === project.clientId)?.name ?? '-'}
        </InfoRow>
        <InfoRow label="담당자">
          {employees.data?.find((item) => item.id === project.managerId)?.name ?? '-'}
        </InfoRow>
        <InfoRow label="공종">{trades || '-'}</InfoRow>
        <InfoRow label="계약일">{project.contractDate ?? '-'}</InfoRow>
        <InfoRow label="현장 주소">{project.siteAddress || '-'}</InfoRow>
        <InfoRow label="현장 담당">
          {project.siteContactName || '-'}
          {project.siteContactPhone && <span className="ml-2">{project.siteContactPhone}</span>}
        </InfoRow>
        {project.accessMemo && <InfoRow label="출입·주의">{project.accessMemo}</InfoRow>}
        {project.memo && <InfoRow label="메모">{project.memo}</InfoRow>}
      </dl>
    </section>
  );
};

// 패널 하나를 카드로 감쌈 (패널 안의 상자는 자동으로 한 단계 어두운 면이 됨)
const Panel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl bg-surface-subtle p-5 ${className ?? ''}`}>{children}</div>
);

// 현장에서 바로 남기는 네 가지
const LEAVE_NOW = [
  {
    label: '오늘 작업',
    icon: ClipboardPen,
    to: (id: string) => projectWorkPath(id, todayInSeoul(new Date())),
  },
  { label: '사진', icon: Camera, to: (id: string) => `/projects/${id}/photos` },
  { label: '자재', icon: Package, to: (id: string) => `/projects/${id}/materials` },
  { label: '메모', icon: NotebookPen, to: (id: string) => `/projects/${id}/memos` },
];

type Section = 'overview' | 'assignments' | 'labor' | 'info' | 'all';

const show = (section: Section, ...targets: Exclude<Section, 'all'>[]) =>
  section === 'all' || targets.includes(section as Exclude<Section, 'all'>);

export const ProjectCardPage = ({ section = 'all' }: { section?: Section }) => {
  const { id = '' } = useParams();
  const project = useProject(id);

  if (project.isPending) {
    return <p className="text-sm">프로젝트를 불러오는 중</p>;
  }

  if (project.isError) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  if (!project.data) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">프로젝트를 찾을 수 없습니다</h2>
        <Link className="min-h-touch content-center text-primary underline" to="/projects">
          프로젝트 목록으로
        </Link>
      </div>
    );
  }

  const { data } = project;

  return (
    <div className="flex flex-col gap-5">
      {show(section, 'overview') && (
        <section aria-labelledby="leave-now-heading" className="flex flex-col gap-3">
          <h2 id="leave-now-heading" className="text-lg font-bold">
            지금 남기기
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {LEAVE_NOW.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.to(data.id)}
                  className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl bg-surface-subtle text-base font-semibold hover:bg-muted"
                >
                  <item.icon aria-hidden className="size-6 text-primary" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {show(section, 'overview') && <ProjectKpis projectId={data.id} />}

      {show(section, 'overview') && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <Panel>
              <ProjectStatusPanel project={data} />
            </Panel>
            <Panel>
              <ProjectProgressPanel projectId={data.id} status={data.status} />
            </Panel>
          </div>
          <aside className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-6">
            <Panel>
              <ProjectInfoSummary project={data} />
            </Panel>
          </aside>
        </div>
      )}

      {show(section, 'assignments') && (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-5">
            <Panel>
              <ProjectAssignmentsPanel project={data} />
            </Panel>
            <Panel>
              <RequiredCredentialsPanel projectId={data.id} />
            </Panel>
          </div>
          <Panel>
            <ProjectWorkerTable projectId={data.id} />
          </Panel>
        </div>
      )}

      {show(section, 'labor') && (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Panel>
            <ProjectWorkSummaryPanel projectId={data.id} />
          </Panel>
          <Panel>
            <ProjectLaborCostPanel projectId={data.id} />
          </Panel>
        </div>
      )}

      {show(section, 'info') && (
        <>
          <Panel>
            <section className="flex flex-col gap-4" aria-labelledby="info-heading">
              <h2 id="info-heading" className="text-lg font-bold">
                기본정보
              </h2>
              <ProjectForm project={data} />
            </section>
          </Panel>
          <Panel>
            <ProjectPeriodHistory projectId={data.id} />
          </Panel>
        </>
      )}
    </div>
  );
};

// 메뉴별 화면 (라우터가 쓴다)
export const ProjectOverviewPage = () => <ProjectCardPage section="overview" />;
export const ProjectAssignmentsPage = () => <ProjectCardPage section="assignments" />;
export const ProjectLaborPage = () => <ProjectCardPage section="labor" />;
export const ProjectInfoPage = () => <ProjectCardPage section="info" />;
