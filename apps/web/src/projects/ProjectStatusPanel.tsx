import {
  PROJECT_REASON_REQUIRED,
  PROJECT_STATUS_LABELS,
  PROJECT_TRANSITIONS,
  transitionDateLabel,
  todayInSeoul,
  validateProjectTransition,
  type ProjectDetail,
  type ProjectStatus,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { splitServerErrors } from '../lib/serverErrors';

import { useProjectHistory, useTransitionProject } from './useProjects';

// 전환 버튼 이름 (같은 '진행'이라도 처음 시작과 재개는 다르게 부른다)
const actionLabel = (from: ProjectStatus, to: ProjectStatus) => {
  if (to === 'IN_PROGRESS') return from === 'SUSPENDED' ? '작업 재개' : '작업 시작';
  if (to === 'SUSPENDED') return '작업 중단';
  if (to === 'COMPLETED') return '완료 처리';

  return '프로젝트 취소';
};

const CONFIRM_HINTS: Partial<Record<ProjectStatus, string>> = {
  IN_PROGRESS: '작업일지를 입력할 수 있게 됩니다',
  SUSPENDED: '중단 중에는 새 투입이 막힙니다. 사유를 남겨 주세요',
  COMPLETED: '완료하면 상태를 더 바꿀 수 없습니다 (보증·종료는 이후 단계에서 추가됩니다)',
  CANCELLED: '취소해도 지금까지의 기록은 그대로 남지만, 이 프로젝트는 더 수정할 수 없습니다',
};

const formatChangedAt = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

// 한 번에 하나의 전환만 확인 단계를 연다
const TransitionForm = ({
  project,
  to,
  onClose,
  onDone,
}: {
  project: ProjectDetail;
  to: ProjectStatus;
  onClose: () => void;
  onDone: (message: string) => void;
}) => {
  const transition = useTransitionProject(project.id);
  const history = useProjectHistory(project.id);
  const today = todayInSeoul(new Date());
  const [effectiveOn, setEffectiveOn] = useState(today);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');
  const needsReason = PROJECT_REASON_REQUIRED.includes(to);
  const dateLabel = transitionDateLabel(project.status, to);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');

    // 서버와 같은 공유 규칙으로 먼저 검사해 입력칸 옆에 바로 보여 줌
    const lastEffectiveOn = (history.data ?? []).reduce<string | null>(
      (latest, item) => (latest === null || item.effectiveOn > latest ? item.effectiveOn : latest),
      null,
    );
    const checked = validateProjectTransition({
      from: project.status,
      to,
      effectiveOn,
      reason,
      actualStart: project.actualStart,
      lastEffectiveOn,
      today,
    });

    if (!checked.ok) {
      setErrors({ [checked.path]: checked.message });
      return;
    }

    // mutate의 개별 콜백은 성공으로 상태가 바뀌어 이 폼이 다시 그려지면(key 변경) 호출되지 못하므로 Promise로 처리
    void transition
      .mutateAsync({ toStatus: to, effectiveOn, reason: reason.trim() || null })
      .then(() => onDone(`'${PROJECT_STATUS_LABELS[to]}' 상태로 바꿨습니다`))
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, ['effectiveOn', 'reason', 'toStatus']);

        setErrors(byField);
        setRootError(root || byField.toStatus || '');
      });
  };

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-border p-3"
      onSubmit={submit}
      noValidate
      aria-label={`${actionLabel(project.status, to)} 확인`}
    >
      <p className="text-sm font-medium">
        {actionLabel(project.status, to)}: &apos;{PROJECT_STATUS_LABELS[project.status]}&apos; →
        &apos;{PROJECT_STATUS_LABELS[to]}&apos;
      </p>
      {CONFIRM_HINTS[to] && <p className="text-sm text-foreground/70">{CONFIRM_HINTS[to]}</p>}
      {rootError && <Alert>{rootError}</Alert>}
      <FormField label={dateLabel} error={errors.effectiveOn}>
        <Input
          type="date"
          max={today}
          value={effectiveOn}
          onChange={(event) => setEffectiveOn(event.target.value)}
        />
      </FormField>
      <FormField label={needsReason ? '사유 (필수)' : '사유 (선택)'} error={errors.reason}>
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
      </FormField>
      <div className="flex gap-2">
        <Button
          type="submit"
          variant={to === 'CANCELLED' ? 'danger' : 'primary'}
          disabled={transition.isPending}
        >
          {transition.isPending ? '처리 중' : '확인'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          닫기
        </Button>
      </div>
    </form>
  );
};

/**
 * @description 프로젝트 상태 패널: 현재 상태와 실제 시작·완료일, 허용된 전환 버튼, 변경 이력 (서비스 기획서 §10.3)
 * @param props 프로젝트 기본정보
 */
export const ProjectStatusPanel = ({ project }: { project: ProjectDetail }) => {
  const history = useProjectHistory(project.id);
  const [open, setOpen] = useState<ProjectStatus | null>(null);
  const [done, setDone] = useState('');
  const options = PROJECT_TRANSITIONS[project.status];

  return (
    <section className="flex flex-col gap-3" aria-labelledby="status-heading">
      <h2 id="status-heading" className="text-lg font-bold">
        상태
      </h2>
      {done && <Alert variant="info">{done}</Alert>}
      <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-sm">
        <dt className="text-foreground/70">현재 상태</dt>
        <dd className="font-medium">{PROJECT_STATUS_LABELS[project.status]}</dd>
        <dt className="text-foreground/70">실제 시작일</dt>
        <dd>{project.actualStart ?? '아직 시작 전'}</dd>
        <dt className="text-foreground/70">실제 완료일</dt>
        <dd>{project.actualEnd ?? '-'}</dd>
      </dl>

      {options.length > 0 ? (
        <div className="flex flex-col gap-2">
          {open === null && (
            <div className="flex flex-wrap gap-2">
              {options.map((to) => (
                <Button
                  key={to}
                  type="button"
                  variant={to === 'CANCELLED' ? 'danger' : 'secondary'}
                  onClick={() => {
                    setDone('');
                    setOpen(to);
                  }}
                >
                  {actionLabel(project.status, to)}
                </Button>
              ))}
            </div>
          )}
          {open !== null && (
            <TransitionForm
              key={`${project.status}-${open}`}
              project={project}
              to={open}
              onClose={() => setOpen(null)}
              onDone={(message) => {
                setOpen(null);
                setDone(message);
              }}
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-foreground/70">
          {project.status === 'CANCELLED'
            ? '취소된 프로젝트입니다. 기록은 그대로 조회할 수 있고 더 수정할 수 없습니다'
            : project.status === 'COMPLETED'
              ? '완료된 프로젝트입니다. 보증·종료 처리는 이후 단계에서 추가됩니다'
              : '더 바꿀 수 있는 상태가 없습니다'}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold">상태 변경 이력</h3>
        {history.isPending && <p className="text-sm">이력을 불러오는 중</p>}
        {history.isError && <Alert>이력을 불러오지 못했습니다</Alert>}
        {history.data && history.data.length === 0 && (
          <p className="text-sm text-foreground/70">아직 상태를 바꾼 기록이 없습니다</p>
        )}
        {history.data && history.data.length > 0 && (
          <ol className="divide-y divide-border">
            {history.data.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 py-2 text-sm">
                <span className="font-medium">
                  {item.effectiveOn} {PROJECT_STATUS_LABELS[item.fromStatus]} →{' '}
                  {PROJECT_STATUS_LABELS[item.toStatus]}
                </span>
                {item.reason && <span>사유: {item.reason}</span>}
                <span className="text-foreground/70">기록 {formatChangedAt(item.changedAt)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};
