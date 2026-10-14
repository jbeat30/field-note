import {
  PROJECT_STATUS_LABELS,
  PROJECT_TRANSITIONS,
  transitionDateLabel,
  transitionNeedsReason,
  transitionNeedsSummaryConfirm,
  todayInSeoul,
  transitionNoticeMessage,
  validateProjectTransition,
  type ProjectDetail,
  type ProjectStatus,
} from '@field-note/shared';
import { Check, MoreHorizontal } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { FormField } from '../components/ui/form-field';
import { DateInput } from '../components/ui/date-input';
import { Textarea } from '../components/ui/textarea';
import { cn } from '../lib/cn';
import { splitServerErrors } from '../lib/serverErrors';

import { useTransitionNotices } from '../completion/useCompletion';
import { useWarranty } from '../warranty/useWarranty';

import { useProjectHistory, useTransitionProject } from './useProjects';

// 진행 단계 순서 (중단은 진행 단계에서 잠시 멈춘 것, 취소는 별도)
const STEPS: ProjectStatus[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'WARRANTY', 'CLOSED'];

// 전환 버튼 이름 (같은 '진행'이라도 처음 시작과 재개는 다르게 부른다)
const actionLabel = (from: ProjectStatus, to: ProjectStatus) => {
  if (to === 'IN_PROGRESS') return from === 'SUSPENDED' ? '작업 재개' : '작업 시작';
  if (to === 'SUSPENDED') return '작업 중단';
  if (to === 'COMPLETED') return '완료 처리';
  if (to === 'WARRANTY') return from === 'CLOSED' ? '재오픈' : '보증 시작';
  if (to === 'CLOSED') return '종료 처리';

  return '프로젝트 취소';
};

const confirmHint = (from: ProjectStatus, to: ProjectStatus) => {
  if (to === 'IN_PROGRESS') return '작업 내역를 입력할 수 있게 됩니다';
  if (to === 'SUSPENDED') return '중단 중에는 새 투입이 막힙니다. 사유를 남겨 주세요';
  if (to === 'COMPLETED') return '완료하면 보증 중 또는 종료로 이어서 관리할 수 있습니다';
  if (to === 'CANCELLED') {
    return '취소해도 지금까지의 기록은 그대로 남지만, 이 프로젝트는 더 수정할 수 없습니다';
  }
  if (to === 'WARRANTY') {
    return from === 'CLOSED'
      ? '종료된 프로젝트를 다시 열어 보증 중으로 되돌립니다. 사유를 남겨 주세요'
      : '이후 작업은 사후 작업으로 구분해 기록합니다';
  }

  return '종료하면 프로젝트가 잠겨 조회만 할 수 있습니다 (재오픈 가능). 보증 기간이 끝나기 전에 종료한다면 사유를 남겨 주세요';
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
  // 완료·재개처럼 확인할 것이 있는 전환은 확인 전에 알려 준다 (막지는 않음, §10.3)
  const notices = useTransitionNotices(project.id, to);
  // 보증 기간·종료 예정일로 완료 → 종료/보증 시작 가능 여부와 조기 종료 사유 필요 여부를 판단한다
  const warranty = useWarranty(project.id);
  const warrantyMonths = warranty.data?.months ?? 12;
  const warrantyEndOn = warranty.data?.configured ? warranty.data.endOn : null;
  const today = todayInSeoul(new Date());
  const [effectiveOn, setEffectiveOn] = useState(today);
  const [reason, setReason] = useState('');
  const [confirmSummary, setConfirmSummary] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');
  const needsReason = transitionNeedsReason(project.status, to, { effectiveOn, warrantyEndOn });
  const needsSummary = transitionNeedsSummaryConfirm(project.status, to);
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
      confirmSummary,
      draftLogCount: notices.data?.find((notice) => notice.type === 'DRAFT_LOGS')?.count ?? 0,
      warrantyMonths,
      warrantyEndOn,
      openRepairCount: notices.data?.find((notice) => notice.type === 'OPEN_REPAIRS')?.count ?? 0,
    });

    if (!checked.ok) {
      // 전환 자체가 안 되는 경우(보증 기간·임시 저장 작업 내역 등)는 입력칸이 아니라 전체 안내로 보여 준다
      if (checked.path === 'toStatus') {
        setRootError(checked.message);
      } else {
        setErrors({ [checked.path]: checked.message });
      }

      return;
    }

    // mutate의 개별 콜백은 성공으로 상태가 바뀌어 이 폼이 다시 그려지면(key 변경) 호출되지 못하므로 Promise로 처리
    void transition
      .mutateAsync({
        toStatus: to,
        effectiveOn,
        reason: reason.trim() || null,
        ...(needsSummary ? { confirmSummary } : {}),
      })
      .then(() => onDone(`'${PROJECT_STATUS_LABELS[to]}' 상태로 바꿨습니다`))
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, [
          'effectiveOn',
          'reason',
          'toStatus',
          'confirmSummary',
        ]);

        setErrors(byField);
        setRootError(root || byField.toStatus || '');
      });
  };

  return (
    <form
      className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4"
      onSubmit={submit}
      noValidate
      aria-label={`${actionLabel(project.status, to)} 확인`}
    >
      <p className="text-sm font-medium">
        {actionLabel(project.status, to)}: &apos;{PROJECT_STATUS_LABELS[project.status]}&apos; →
        &apos;{PROJECT_STATUS_LABELS[to]}&apos;
      </p>
      <p className="text-sm text-foreground/70">{confirmHint(project.status, to)}</p>
      {notices.data && notices.data.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" aria-label="확인할 것">
          {notices.data.map((notice) => (
            <li key={notice.type} className="rounded-md bg-muted px-3 py-2">
              {transitionNoticeMessage(notice)}
            </li>
          ))}
        </ul>
      )}
      {rootError && <Alert>{rootError}</Alert>}
      <FormField label={dateLabel} error={errors.effectiveOn}>
        <DateInput
          max={today}
          value={effectiveOn}
          onChange={(event) => setEffectiveOn(event.target.value)}
        />
      </FormField>
      <FormField label={needsReason ? '사유 (필수)' : '사유 (선택)'} error={errors.reason}>
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
      </FormField>
      {needsSummary && (
        <div className="flex flex-col gap-1">
          <Link to={`/projects/${project.id}/summary`} className="text-sm text-primary underline">
            프로젝트 요약 보기
          </Link>
          <label className="flex min-h-touch items-center gap-3 text-base">
            <Checkbox
              checked={confirmSummary}
              onCheckedChange={(checked) => setConfirmSummary(checked === true)}
            />
            프로젝트 요약을 확인했습니다
          </label>
          {errors.confirmSummary && (
            <p role="alert" className="text-sm text-danger">
              {errors.confirmSummary}
            </p>
          )}
        </div>
      )}
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
  const showWarranty = ['COMPLETED', 'WARRANTY', 'CLOSED'].includes(project.status);
  const warranty = useWarranty(project.id);
  const [open, setOpen] = useState<ProjectStatus | null>(null);
  const [done, setDone] = useState('');
  const options = PROJECT_TRANSITIONS[project.status];

  const stepIndex = STEPS.indexOf(project.status === 'SUSPENDED' ? 'IN_PROGRESS' : project.status);
  const mainOptions = options.filter((to) => to !== 'SUSPENDED' && to !== 'CANCELLED');
  const sideOptions = options.filter((to) => to === 'SUSPENDED' || to === 'CANCELLED');
  const openAction = (to: ProjectStatus) => {
    setDone('');
    setOpen(to);
  };

  return (
    <section className="flex flex-col gap-5" aria-labelledby="status-heading">
      <h2 id="status-heading" className="text-lg font-bold">
        진행 단계
      </h2>
      {done && <Alert variant="info">{done}</Alert>}

      {/* 프로그레스 바: 원 + 절대 위치 연결선 */}
      {project.status === 'CANCELLED' ? (
        <Alert>취소된 프로젝트입니다. 기록은 그대로 조회할 수 있고 더 수정할 수 없습니다</Alert>
      ) : (
        <div className="relative flex justify-between" role="list" aria-label="진행 단계">
          {/* 전체 트랙 */}
          <div className="absolute top-[17px] right-4 left-4 h-0.5 bg-muted" />
          {/* 완료 트랙 */}
          {stepIndex > 0 && (
            <div
              className="absolute top-[17px] left-4 h-0.5 bg-primary transition-all duration-500"
              style={{
                width: `calc(${(stepIndex / (STEPS.length - 1)) * 100}% - 2rem)`,
              }}
            />
          )}
          {STEPS.map((step, index) => (
            <div
              key={step}
              role="listitem"
              aria-current={index === stepIndex ? 'step' : undefined}
              className="relative z-10 flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  'grid size-[34px] place-items-center rounded-full text-sm font-bold',
                  index < stepIndex && 'bg-primary text-primary-foreground',
                  index === stepIndex &&
                    'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  index > stepIndex && 'bg-muted text-foreground/70',
                )}
              >
                {index < stepIndex ? <Check aria-hidden className="size-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-center text-xs font-medium leading-tight',
                  index <= stepIndex ? 'text-foreground' : 'text-foreground/70',
                )}
              >
                {PROJECT_STATUS_LABELS[step]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 상태 요약 + 버튼 한 줄 */}
      {project.status !== 'CANCELLED' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-foreground/65">현재 상태</dt>
              <dd className="font-semibold">
                {project.status === 'SUSPENDED'
                  ? '작업 중단'
                  : PROJECT_STATUS_LABELS[project.status]}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-foreground/65">실제 시작일</dt>
              <dd className="font-semibold">{project.actualStart ?? '-'}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-foreground/65">실제 완료일</dt>
              <dd className="font-semibold">{project.actualEnd ?? '-'}</dd>
            </div>
            {showWarranty && warranty.data && warranty.data.configured && (
              <div className="flex gap-1.5">
                <dt className="text-foreground/65">보증</dt>
                <dd className="font-semibold">
                  {warranty.data.months === 0
                    ? '보증 없음'
                    : `${warranty.data.months}개월 · ~${warranty.data.endOn ?? '-'}`}
                </dd>
              </div>
            )}
          </dl>

          {/* 전환 버튼: 주 버튼 1개 + 더보기(⋯)로 중단·취소 */}
          {options.length > 0 && open === null && (
            <div className="flex shrink-0 items-center gap-2">
              {mainOptions.slice(0, 1).map((to) => (
                <Button key={to} type="button" onClick={() => openAction(to)}>
                  {actionLabel(project.status, to)}
                </Button>
              ))}
              {mainOptions.length > 1 &&
                mainOptions.slice(1).map((to) => (
                  <Button key={to} type="button" variant="secondary" onClick={() => openAction(to)}>
                    {actionLabel(project.status, to)}
                  </Button>
                ))}
              {sideOptions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="그 밖의 처리">
                      <MoreHorizontal aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {sideOptions.map((to) => (
                      <DropdownMenuItem
                        key={to}
                        danger={to === 'CANCELLED'}
                        onSelect={() => openAction(to)}
                      >
                        {actionLabel(project.status, to)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      )}

      {project.status === 'SUSPENDED' && (
        <Alert variant="warning">지금은 작업이 중단된 상태입니다</Alert>
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

      <details className="rounded-lg bg-surface-nested px-3 py-1 text-sm">
        <summary className="min-h-touch cursor-pointer content-center font-medium">
          상태 변경 이력{history.data ? ` (${history.data.length})` : ''}
        </summary>
        <div className="pb-2">
          {history.isPending && <p>이력을 불러오는 중</p>}
          {history.isError && <Alert>이력을 불러오지 못했습니다</Alert>}
          {history.data && history.data.length === 0 && (
            <p className="text-foreground/70">아직 상태를 바꾼 기록이 없습니다</p>
          )}
          {history.data && history.data.length > 0 && (
            <ol className="divide-y divide-line">
              {history.data.map((item) => (
                <li key={item.id} className="flex flex-col gap-0.5 py-2">
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
      </details>
    </section>
  );
};
