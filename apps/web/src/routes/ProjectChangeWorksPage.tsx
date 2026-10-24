import {
  CHANGE_WORK_STATUSES,
  CHANGE_WORK_STATUS_LABELS,
  changeWorkProjectCheck,
  type ChangeWorkStatus,
} from '@field-note/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { ChangeWorkDetailDialog } from '../changeWorks/ChangeWorkDetailDialog';
import { ChangeWorkForm } from '../changeWorks/ChangeWorkForm';
import { ChangeWorkTable } from '../changeWorks/ChangeWorkTable';
import { ChangeWorkUsagePanel } from '../changeWorks/ChangeWorkUsagePanel';
import { useChangeWorks } from '../changeWorks/useChangeWorks';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { EmptyState } from '../components/ui/empty-state';
import { Modal } from '../components/ui/modal';
import { Select } from '../components/ui/select';
import { useProject } from '../projects/useProjects';
import { LoadingBlock } from '../components/ui/loading-block';

// 추가 공사: 계약 밖에서 생긴 작업의 요청·협의·승인을 표로 모아 보고, 상세 창에서 상태·증빙(사진·공문)을 다룸
export const ProjectChangeWorksPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [status, setStatus] = useState<ChangeWorkStatus | ''>('');
  const [confirmCompleted, setConfirmCompleted] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const works = useChangeWorks(id, status || undefined);

  if (project.isPending) return <LoadingBlock label="프로젝트를 불러오는 중" variant="page" />;
  if (!project.data) return <Alert>프로젝트를 불러오지 못했습니다</Alert>;

  const gate = changeWorkProjectCheck(project.data.status, true);
  const needsConfirm = project.data.status === 'COMPLETED';
  const editable = gate.ok && (!needsConfirm || confirmCompleted);
  const detail = works.data?.find((work) => work.id === detailId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        level={2}
        title="추가 공사"
        description="계약 밖에서 생긴 작업의 요청·협의·승인을 기록하고, 대화 캡처·합의서 같은 증빙을 남깁니다"
        actions={
          <Button type="button" disabled={!editable} onClick={() => setIsCreating(true)}>
            <Plus aria-hidden />
            추가 공사 기록
          </Button>
        }
      />

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
      {message && <p role="status">{message}</p>}

      <ChangeWorkUsagePanel projectId={id} />

      <section className="flex flex-col gap-3" aria-labelledby="change-list-heading">
        <div className="flex items-center justify-between gap-3 rounded-3xl bg-surface-subtle p-4">
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
        {works.isError && <Alert>추가 공사를 불러오지 못했습니다</Alert>}
        {works.isPending && <LoadingBlock label="불러오는 중" />}
        {works.data && works.data.length === 0 && (
          <EmptyState
            title="기록이 없습니다"
            description={
              status
                ? '다른 상태를 골라 보세요'
                : '계약에 없던 작업을 요청받으면 기록하고 증빙을 남기세요'
            }
          />
        )}
        {works.data && works.data.length > 0 && (
          <ChangeWorkTable works={works.data} onOpen={(work) => setDetailId(work.id)} />
        )}
      </section>

      <Modal
        open={isCreating}
        onOpenChange={setIsCreating}
        title="추가 공사 기록"
        description="누가 언제 무엇을 요청했는지 적습니다. 처음에는 협의 중으로 저장됩니다"
      >
        <ChangeWorkForm
          projectId={id}
          confirmCompleted={needsConfirm && confirmCompleted}
          onSaved={(done) => {
            setIsCreating(false);
            setMessage(done);
          }}
        />
      </Modal>

      {detail && (
        <ChangeWorkDetailDialog
          work={detail}
          projectId={id}
          editable={editable}
          confirmCompleted={needsConfirm && confirmCompleted}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
};
