import { PROJECT_WARNING_LABELS } from '@field-note/shared';

import { Badge } from '../components/ui/badge';
import { ProgressBar } from '../components/ui/progress-bar';
import { useProjectHealth } from '../progress/useProgress';
import { formatWork } from '../workSummary/formatWork';
import { useCompanySettings } from '../settings/useCompanySettings';

import { useAssignments } from './useAssignments';

const Tile = ({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-5">
    <dt className="text-sm text-foreground/70">{label}</dt>
    <dd className="flex flex-col gap-2">
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {children}
    </dd>
  </div>
);

// 프로젝트 개요 맨 위 핵심 수치: 진행률·공수 소진율·투입 공수·투입 인원, 경고 배지
export const ProjectKpis = ({ projectId }: { projectId: string }) => {
  const health = useProjectHealth(projectId);
  const settings = useCompanySettings();
  const assignments = useAssignments(projectId);

  if (!health.data || !settings.data) {
    return <p className="text-sm text-foreground/70">핵심 수치를 불러오는 중</p>;
  }

  const data = health.data;
  const active = assignments.data?.length ?? 0;

  return (
    <section aria-label="핵심 수치" className="flex flex-col gap-3">
      {data.warnings.length > 0 && (
        <ul aria-label="진행 경고" className="flex flex-wrap gap-2">
          {data.warnings.map((warning) => (
            <li key={warning}>
              <Badge tone="danger">{PROJECT_WARNING_LABELS[warning]}</Badge>
            </li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile
          label="진행률"
          value={data.progressPercent === null ? '기록 없음' : `${data.progressPercent}%`}
        >
          {data.progressPercent !== null && (
            <ProgressBar aria-label="진행률 막대" value={data.progressPercent} />
          )}
        </Tile>
        <Tile
          label="공수 소진율"
          value={data.burnPercent === null ? '계획 없음' : `${Math.round(data.burnPercent)}%`}
        >
          {data.burnPercent !== null && (
            <ProgressBar
              aria-label="소진율 막대"
              value={data.burnPercent}
              tone={
                data.burnPercent >= 100 ? 'danger' : data.burnPercent >= 80 ? 'warning' : 'primary'
              }
            />
          )}
        </Tile>
        <Tile label="투입 공수" value={formatWork(data.usedMinutes, settings.data)}>
          {data.plannedMinutes !== null && (
            <span className="text-xs text-foreground/70">
              계획 {formatWork(data.plannedMinutes, settings.data)}
            </span>
          )}
        </Tile>
        <Tile label="투입 인원" value={`${active}명`} />
      </dl>
    </section>
  );
};
