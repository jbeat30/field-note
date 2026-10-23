import {
  PROJECT_STATUS_LABELS,
  WARRANTY_START_BASIS_LABELS,
  warrantyProjectCheck,
} from '@field-note/shared';
import { useParams } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { useProject } from '../projects/useProjects';
import { WarrantyCertificates } from '../warranty/WarrantyCertificates';
import { WarrantyForm } from '../warranty/WarrantyForm';
import { useWarranty } from '../warranty/useWarranty';

const formatChangedAt = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const daysText = (daysLeft: number) =>
  daysLeft < 0 ? `${-daysLeft}일 지남` : daysLeft === 0 ? '오늘 종료' : `${daysLeft}일 남음`;

// 보증: 보증 기간과 종료 예정일, 보증서, 변경 이력 관리, 완료·보증 중에만 변경 가능
export const ProjectWarrantyPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const warranty = useWarranty(id);

  if (project.isPending || warranty.isPending) {
    return <p className="text-sm">보증 정보를 불러오는 중</p>;
  }

  if (!project.data || !warranty.data) {
    return <Alert>보증 정보를 불러오지 못했습니다</Alert>;
  }

  const gate = warrantyProjectCheck(project.data.status);
  const data = warranty.data;
  // 아직 완료하지 않은 프로젝트는 설정할 것이 없으므로 폼·보증서 대신 한 줄 안내와 기본값만 표시
  const projectStatus = project.data.status;
  const beforeCompletion = (['PLANNED', 'IN_PROGRESS', 'SUSPENDED'] as const).some(
    (status) => status === projectStatus,
  );

  const showPeriod = data.months > 0 && data.endOn !== null && data.daysLeft !== null;
  const card = 'flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader level={2} title="보증" description="보증 기간과 보증서를 관리합니다" />

      {beforeCompletion ? (
        <section className={card} aria-labelledby="warranty-wait-heading">
          <h2 id="warranty-wait-heading" className="text-lg font-bold">
            보증은 완료 후에 설정합니다
          </h2>
          <p className="text-sm">프로젝트를 완료하면 보증을 설정할 수 있습니다</p>
          <p className="text-sm text-foreground/70">
            기본값은 {data.months === 0 ? '보증 없음' : `${data.months}개월`}이고,{' '}
            {WARRANTY_START_BASIS_LABELS[data.startBasis]}부터 셉니다
          </p>
        </section>
      ) : (
        <>
          {!gate.ok && <Alert variant="info">{gate.message}. 조회만 할 수 있습니다</Alert>}

          <section className={card} aria-labelledby="warranty-state-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="warranty-state-heading" className="text-lg font-bold">
                현재 보증
              </h2>
              {showPeriod && (
                <Badge
                  tone={
                    data.daysLeft! < 0 ? 'neutral' : data.daysLeft! <= 30 ? 'warning' : 'success'
                  }
                >
                  {daysText(data.daysLeft!)}
                </Badge>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              {[
                ['프로젝트 상태', PROJECT_STATUS_LABELS[project.data.status]],
                [
                  '보증 기간',
                  `${data.months === 0 ? '보증 없음' : `${data.months}개월`}${data.configured ? '' : ' (기본값)'}`,
                ],
                ['시작일', data.startOn ?? '-'],
                ['종료 예정일', data.endOn ?? '-'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-surface-nested p-3">
                  <dt className="text-xs text-foreground/70">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-foreground/70">
              시작 기준: {WARRANTY_START_BASIS_LABELS[data.startBasis]}
            </p>
          </section>

          <div className="grid items-start gap-5 xl:grid-cols-2">
            <section className={card} aria-labelledby="warranty-form-heading">
              <h2 id="warranty-form-heading" className="text-lg font-bold">
                보증 설정
              </h2>
              <WarrantyForm project={project.data} warranty={data} editable={gate.ok} />
            </section>

            <section className={card} aria-labelledby="warranty-cert-heading">
              <h2 id="warranty-cert-heading" className="text-lg font-bold">
                보증서
              </h2>
              <WarrantyCertificates projectId={id} warranty={data} editable={gate.ok} />
            </section>
          </div>

          <details className={card}>
            <summary
              id="warranty-history-heading"
              className="min-h-touch cursor-pointer content-center text-lg font-bold"
            >
              변경 이력 ({data.changes.length})
            </summary>
            {data.changes.length === 0 ? (
              <p className="text-sm text-foreground/70">아직 저장한 보증 설정이 없습니다</p>
            ) : (
              <ol className="divide-y divide-line">
                {data.changes.map((change) => (
                  <li key={change.id} className="flex flex-col gap-0.5 py-2 text-sm">
                    <span className="font-medium">
                      {change.fromMonths === null
                        ? `${change.toMonths}개월로 설정`
                        : `${change.fromMonths}개월 → ${change.toMonths}개월`}
                      {' · '}
                      종료 예정일 {change.fromEndOn ? `${change.fromEndOn} → ` : ''}
                      {change.toEndOn}
                    </span>
                    <span>
                      시작일 {change.startOn} ({WARRANTY_START_BASIS_LABELS[change.startBasis]})
                    </span>
                    {change.reason && <span>사유: {change.reason}</span>}
                    <span className="text-foreground/70">
                      기록 {formatChangedAt(change.changedAt)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </details>
        </>
      )}
    </div>
  );
};
