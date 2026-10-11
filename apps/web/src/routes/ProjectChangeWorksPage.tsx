import {
  CHANGE_WORK_STATUSES,
  CHANGE_WORK_STATUS_LABELS,
  changeWorkProjectCheck,
  type ChangeWorkStatus,
} from '@field-note/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { ChangeWorkForm } from '../changeWorks/ChangeWorkForm';
import { ChangeWorkItem } from '../changeWorks/ChangeWorkItem';
import { ChangeWorkUsagePanel } from '../changeWorks/ChangeWorkUsagePanel';
import { useChangeWorks } from '../changeWorks/useChangeWorks';
import { Alert } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { Select } from '../components/ui/select';
import { useProject } from '../projects/useProjects';

// 변경·추가 작업 (서비스 기획서 §10.5): 계약 후 범위·내용이 바뀌거나 늘어나는 일의 요청과 합의를 기록한다.
// 말로 합의하고 먼저 작업하는 일이 많아 누가 언제 요청했는지가 근거가 된다. 금액은 기록하지 않는다
export const ProjectChangeWorksPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [status, setStatus] = useState<ChangeWorkStatus | ''>('');
  const [confirmCompleted, setConfirmCompleted] = useState(false);
  const works = useChangeWorks(id, status || undefined);

  if (project.isPending) {
    return <p className="text-sm">프로젝트를 불러오는 중</p>;
  }

  if (!project.data) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  const gate = changeWorkProjectCheck(project.data.status, true);
  const needsConfirm = project.data.status === 'COMPLETED';
  // 보증 중·종료·취소는 조회만, 완료는 확인해야 기록·수정
  const editable = gate.ok && (!needsConfirm || confirmCompleted);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">변경·추가 작업</h1>
        <Link className="text-primary underline" to={`/projects/${id}`}>
          {project.data.name}
        </Link>
      </div>

      {!gate.ok && <Alert>{gate.message}. 조회만 할 수 있습니다</Alert>}
      {needsConfirm && (
        <label className="flex min-h-touch items-center gap-3">
          <Checkbox
            checked={confirmCompleted}
            onCheckedChange={(checked) => setConfirmCompleted(checked === true)}
            aria-label="완료된 프로젝트에 기록하는 것을 확인합니다"
          />
          <span>완료된 프로젝트입니다. 기록·수정하려면 확인해 주세요</span>
        </label>
      )}

      <ChangeWorkUsagePanel projectId={id} />

      {editable && (
        <section className="flex flex-col gap-3" aria-labelledby="change-new-heading">
          <h2 id="change-new-heading" className="text-lg font-bold">
            새로 기록
          </h2>
          <ChangeWorkForm projectId={id} confirmCompleted={needsConfirm && confirmCompleted} />
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="change-list-heading">
        <h2 id="change-list-heading" className="text-lg font-bold">
          기록 목록
        </h2>
        <Select
          aria-label="상태 필터"
          value={status}
          onChange={(event) => setStatus(event.target.value as ChangeWorkStatus | '')}
        >
          <option value="">전체 상태</option>
          {CHANGE_WORK_STATUSES.map((value) => (
            <option key={value} value={value}>
              {CHANGE_WORK_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
        {works.isError && <Alert>변경·추가 작업을 불러오지 못했습니다</Alert>}
        {works.isPending && <p className="text-sm">불러오는 중</p>}
        {works.data && works.data.length === 0 && (
          <p className="text-foreground/70">기록이 없습니다</p>
        )}
        {works.data && works.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {works.data.map((work) => (
              <ChangeWorkItem
                key={work.id}
                work={work}
                projectId={id}
                editable={editable}
                confirmCompleted={needsConfirm && confirmCompleted}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
