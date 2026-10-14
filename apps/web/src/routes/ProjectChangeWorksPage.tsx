import {
  CHANGE_WORK_STATUSES,
  CHANGE_WORK_STATUS_LABELS,
  changeWorkProjectCheck,
  type ChangeWorkStatus,
} from '@field-note/shared';
import { useState } from 'react';
import { useParams } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { ChangeWorkForm } from '../changeWorks/ChangeWorkForm';
import { ChangeWorkItem } from '../changeWorks/ChangeWorkItem';
import { ChangeWorkUsagePanel } from '../changeWorks/ChangeWorkUsagePanel';
import { useChangeWorks } from '../changeWorks/useChangeWorks';
import { Alert } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { Select } from '../components/ui/select';
import { useProject } from '../projects/useProjects';

export const ProjectChangeWorksPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [status, setStatus] = useState<ChangeWorkStatus | ''>('');
  const [confirmCompleted, setConfirmCompleted] = useState(false);
  const works = useChangeWorks(id, status || undefined);

  if (project.isPending) return <p className="text-sm">프로젝트를 불러오는 중</p>;
  if (!project.data) return <Alert>프로젝트를 불러오지 못했습니다</Alert>;

  const gate = changeWorkProjectCheck(project.data.status, true);
  const needsConfirm = project.data.status === 'COMPLETED';
  const editable = gate.ok && (!needsConfirm || confirmCompleted);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <PageHeader
          level={2}
          title="변경·추가 작업"
          description="계약 밖에서 생긴 작업의 협의와 승인을 기록합니다"
        />
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

      {/* xl+: 왼쪽 새로 기록 / 오른쪽 목록 */}
      <div className="grid items-start gap-5 xl:grid-cols-[380px_1fr]">
        {/* 왼쪽: 새로 기록 폼 */}
        {editable && (
          <div className="rounded-xl bg-surface-subtle p-4">
            <section className="flex flex-col gap-3" aria-labelledby="change-new-heading">
              <h2 id="change-new-heading" className="text-base font-semibold">
                새로 기록
              </h2>
              <ChangeWorkForm projectId={id} confirmCompleted={needsConfirm && confirmCompleted} />
            </section>
          </div>
        )}

        {/* 오른쪽: 기록 목록 */}
        <section className={editable ? '' : 'xl:col-span-2'} aria-labelledby="change-list-heading">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="change-list-heading" className="text-base font-semibold">
                기록 목록
              </h2>
              <Select
                className="w-40"
                aria-label="상태 필터"
                value={status}
                emptyLabel="전체 상태"
                onValueChange={setStatus}
                options={CHANGE_WORK_STATUSES.map((value) => ({
                  value: value,
                  label: CHANGE_WORK_STATUS_LABELS[value],
                }))}
              />
            </div>
            {works.isError && <Alert>변경·추가 작업을 불러오지 못했습니다</Alert>}
            {works.isPending && <p className="text-sm">불러오는 중</p>}
            {works.data && works.data.length === 0 && (
              <p className="text-foreground/70 text-sm">기록이 없습니다</p>
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
          </div>
        </section>
      </div>
    </div>
  );
};
