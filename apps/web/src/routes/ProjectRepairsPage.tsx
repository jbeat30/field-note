import {
  REPAIR_STATUSES,
  REPAIR_STATUS_LABELS,
  repairProjectCheck,
  type RepairStatus,
} from '@field-note/shared';
import { useState } from 'react';
import { useParams } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Select } from '../components/ui/select';
import { useProject } from '../projects/useProjects';
import { AfterServiceUsagePanel } from '../repairs/AfterServiceUsagePanel';
import { RepairForm } from '../repairs/RepairForm';
import { RepairItem } from '../repairs/RepairItem';
import { useRepairs } from '../repairs/useRepairs';

// 보수 요청 (서비스 기획서 §10.6): 보증 중에 고객이 요청한 하자 보수를 접수부터 처리까지 기록한다.
// 보수 작업은 일지·자재 기록에 "사후 작업"으로 표시하고 요청에 연결해 건별 공수·자재를 본다
export const ProjectRepairsPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [status, setStatus] = useState<RepairStatus | ''>('');
  const repairs = useRepairs(id, status || undefined);

  if (project.isPending) {
    return <p className="text-sm">프로젝트를 불러오는 중</p>;
  }

  if (!project.data) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  const gate = repairProjectCheck(project.data.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <PageHeader
          level={2}
          title="보수 요청"
          description="보증 기간 중 접수한 보수 요청을 처리합니다"
        />
      </div>

      {!gate.ok && <Alert>{gate.message}. 조회만 할 수 있습니다</Alert>}

      <AfterServiceUsagePanel projectId={id} />

      {gate.ok && (
        <section className="flex flex-col gap-3" aria-labelledby="repair-new-heading">
          <h2 id="repair-new-heading" className="text-lg font-bold">
            새로 접수
          </h2>
          <RepairForm projectId={id} />
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="repair-list-heading">
        <h2 id="repair-list-heading" className="text-lg font-bold">
          접수 목록
        </h2>
        <Select
          aria-label="상태 필터"
          value={status}
          onChange={(event) => setStatus(event.target.value as RepairStatus | '')}
        >
          <option value="">전체 상태</option>
          {REPAIR_STATUSES.map((value) => (
            <option key={value} value={value}>
              {REPAIR_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
        {repairs.isError && <Alert>보수 요청을 불러오지 못했습니다</Alert>}
        {repairs.isPending && <p className="text-sm">불러오는 중</p>}
        {repairs.data && repairs.data.length === 0 && (
          <p className="text-foreground/70">접수한 보수 요청이 없습니다</p>
        )}
        {repairs.data && repairs.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {repairs.data.map((repair) => (
              <RepairItem key={repair.id} repair={repair} projectId={id} editable={gate.ok} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
