import {
  PROJECT_STATUS_LABELS,
  WARRANTY_START_BASIS_LABELS,
  warrantyProjectCheck,
} from '@field-note/shared';
import { Link, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
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

// 보증 (서비스 기획서 §10.6): 보증 기간과 종료 예정일, 보증서, 변경 이력을 관리한다. 완료·보증 중에만 바꿀 수 있다
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">보증</h1>
        <Link className="text-primary underline" to={`/projects/${id}`}>
          {project.data.name}
        </Link>
      </div>

      {!gate.ok && <Alert>{gate.message}. 조회만 할 수 있습니다</Alert>}

      <section className="flex flex-col gap-2" aria-labelledby="warranty-state-heading">
        <h2 id="warranty-state-heading" className="text-lg font-bold">
          현재 보증
        </h2>
        <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-sm">
          <dt className="text-foreground/70">프로젝트 상태</dt>
          <dd>{PROJECT_STATUS_LABELS[project.data.status]}</dd>
          <dt className="text-foreground/70">보증 기간</dt>
          <dd>
            {data.months === 0 ? '보증 없음' : `${data.months}개월`}
            {data.configured ? '' : ' (기본값, 아직 저장 전)'}
          </dd>
          <dt className="text-foreground/70">시작 기준</dt>
          <dd>{WARRANTY_START_BASIS_LABELS[data.startBasis]}</dd>
          <dt className="text-foreground/70">시작일</dt>
          <dd>{data.startOn ?? '-'}</dd>
          <dt className="text-foreground/70">종료 예정일</dt>
          <dd>
            {data.endOn ?? '-'}
            {data.endOn && data.daysLeft !== null && data.months > 0
              ? ` (${daysText(data.daysLeft)})`
              : ''}
          </dd>
        </dl>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="warranty-form-heading">
        <h2 id="warranty-form-heading" className="text-lg font-bold">
          보증 설정
        </h2>
        <WarrantyForm project={project.data} warranty={data} editable={gate.ok} />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="warranty-cert-heading">
        <h2 id="warranty-cert-heading" className="text-lg font-bold">
          보증서
        </h2>
        <WarrantyCertificates projectId={id} warranty={data} editable={gate.ok} />
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="warranty-history-heading">
        <h2 id="warranty-history-heading" className="text-lg font-bold">
          변경 이력
        </h2>
        {data.changes.length === 0 ? (
          <p className="text-sm text-foreground/70">아직 저장한 보증 설정이 없습니다</p>
        ) : (
          <ol className="divide-y divide-border">
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
                <span className="text-foreground/70">기록 {formatChangedAt(change.changedAt)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};
