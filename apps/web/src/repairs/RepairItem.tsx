import {
  MATERIAL_RECORD_KIND_LABELS,
  REPAIR_CONTENT_MAX_LENGTH,
  REPAIR_LOCATION_MAX_LENGTH,
  REPAIR_REQUESTER_MAX_LENGTH,
  REPAIR_STATUSES,
  REPAIR_STATUS_LABELS,
  canEditRepair,
  repairUpdateSchema,
  todayInSeoul,
  validateRepairTransition,
  type RepairRequest,
  type RepairRequestDetail,
  type RepairStatus,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { formatDay } from '../lib/dates';
import { splitServerErrors } from '../lib/serverErrors';
import { useMaterialRecordHistory, useMaterials } from '../materials/useMaterials';
import { useCompanySettings } from '../settings/useCompanySettings';
import { useWorkLogList } from '../workLogs/useWorkLogs';
import { formatWork } from '../workSummary/formatWork';

import {
  useLinkRepair,
  useRepairDetail,
  useTransitionRepair,
  useUnlinkRepair,
  useUpdateRepair,
} from './useRepairs';
import { LoadingBlock } from '../components/ui/loading-block';

const TRANSITION_LABELS: Record<RepairStatus, string> = {
  RECEIVED: '접수로 되돌리기',
  IN_PROGRESS: '처리 시작',
  ON_HOLD: '보류',
  DONE: '완료 처리',
};

const StatusForm = ({
  detail,
  to,
  onDone,
  onClose,
}: {
  detail: RepairRequestDetail;
  to: RepairStatus;
  onDone: (message: string) => void;
  onClose: () => void;
}) => {
  const transition = useTransitionRepair(detail.id);
  const today = todayInSeoul(new Date());
  const [effectiveOn, setEffectiveOn] = useState(today);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');
  const needsNote = to === 'ON_HOLD' || detail.status === 'DONE';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');

    // 서버와 같은 공유 규칙으로 먼저 검사해 입력칸 옆에 바로 보여 줌
    const checked = validateRepairTransition({
      from: detail.status,
      to,
      effectiveOn,
      note: note.trim() || null,
      receivedOn: detail.receivedOn,
      today,
    });

    if (!checked.ok) {
      setErrors({ [checked.path]: checked.message });
      return;
    }

    // 성공하면 상태가 바뀌어 이 폼이 다시 그려지므로 Promise로 처리
    void transition
      .mutateAsync({ toStatus: to, effectiveOn, ...(note.trim() ? { note: note.trim() } : {}) })
      .then(() => onDone(`'${REPAIR_STATUS_LABELS[to]}' 상태로 바꿨습니다`))
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, ['effectiveOn', 'note', 'toStatus']);

        setErrors(byField);
        setRootError(root || byField.toStatus || '');
      });
  };

  return (
    <form
      className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4"
      onSubmit={submit}
      noValidate
      aria-label={`${TRANSITION_LABELS[to]} 확인`}
    >
      <p className="text-sm font-medium">
        &apos;{REPAIR_STATUS_LABELS[detail.status]}&apos; → &apos;{REPAIR_STATUS_LABELS[to]}&apos;
      </p>
      {rootError && <Alert>{rootError}</Alert>}
      <FormField label="바뀐 날" error={errors.effectiveOn}>
        <DateInput
          max={today}
          value={effectiveOn}
          onChange={(event) => setEffectiveOn(event.target.value)}
        />
      </FormField>
      <FormField label={needsNote ? '사유 (필수)' : '메모 (선택)'} error={errors.note}>
        <Textarea
          placeholder="처리 내용을 입력하세요"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" disabled={transition.isPending}>
          {transition.isPending ? '처리 중' : '확인'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          닫기
        </Button>
      </div>
    </form>
  );
};

const EditForm = ({
  detail,
  onDone,
  onClose,
}: {
  detail: RepairRequestDetail;
  onDone: () => void;
  onClose: () => void;
}) => {
  const update = useUpdateRepair(detail.id);
  const today = todayInSeoul(new Date());
  const [receivedOn, setReceivedOn] = useState(detail.receivedOn);
  const [requester, setRequester] = useState(detail.requester);
  const [location, setLocation] = useState(detail.location ?? '');
  const [content, setContent] = useState(detail.content);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');

    const parsed = repairUpdateSchema.safeParse({
      receivedOn,
      requester,
      content,
      location: location.trim() || null,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] ??= issue.message;
      }

      setErrors(next);
      return;
    }

    void update
      .mutateAsync(parsed.data)
      .then(onDone)
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, [
          'receivedOn',
          'requester',
          'content',
          'location',
        ]);

        setErrors(byField);
        setRootError(root);
      });
  };

  return (
    <form
      className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4"
      onSubmit={submit}
      noValidate
      aria-label="보수 요청 수정"
    >
      {rootError && <Alert>{rootError}</Alert>}
      <FormField label="접수일" error={errors.receivedOn}>
        <DateInput
          max={today}
          value={receivedOn}
          onChange={(event) => setReceivedOn(event.target.value)}
        />
      </FormField>
      <FormField label="요청자" error={errors.requester}>
        <Input
          placeholder="요청한 사람 또는 업체"
          maxLength={REPAIR_REQUESTER_MAX_LENGTH}
          value={requester}
          onChange={(event) => setRequester(event.target.value)}
        />
      </FormField>
      <FormField label="위치 (선택)" error={errors.location}>
        <Input
          placeholder="예: 3층 화장실"
          maxLength={REPAIR_LOCATION_MAX_LENGTH}
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
      </FormField>
      <FormField label="요청 내용" error={errors.content}>
        <Textarea
          placeholder="보수 요청 내용을 입력하세요"
          maxLength={REPAIR_CONTENT_MAX_LENGTH}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? '저장 중' : '저장'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          닫기
        </Button>
      </div>
    </form>
  );
};

// 사후 작업: 보증 중에 "사후 작업"으로 표시한 작업 내역·자재 기록을 이 요청에 연결해 건별로 사용한 공수·자재 확인
const AfterServiceLinks = ({
  detail,
  projectId,
  editable,
}: {
  detail: RepairRequestDetail;
  projectId: string;
  editable: boolean;
}) => {
  const settings = useCompanySettings();
  const logs = useWorkLogList(projectId);
  const records = useMaterialRecordHistory(projectId);
  const materials = useMaterials();
  const link = useLinkRepair(detail.id);
  const unlink = useUnlinkRepair(detail.id);
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const linkedLogs = new Set(
    detail.links.flatMap((item) => (item.kind === 'WORK_LOG' ? [item.workLogId] : [])),
  );
  const linkedRecords = new Set(
    detail.links.flatMap((item) => (item.kind === 'MATERIAL' ? [item.materialRecordId] : [])),
  );
  const materialName = (id: string) =>
    materials.data?.find((item) => item.id === id)?.name ?? '자재';
  const logChoices = (logs.data ?? []).filter(
    (item) => item.isAfterService && item.status === 'SAVED' && !linkedLogs.has(item.id),
  );
  const recordChoices = (records.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (item) => item.isAfterService && !linkedRecords.has(item.id),
  );
  const fail = (value: unknown) => setError(splitServerErrors(value, []).root);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medium">연결한 사후 작업</h3>
      {error && <Alert>{error}</Alert>}
      {detail.links.length === 0 ? (
        <p className="text-sm text-sub">연결한 사후 작업이 없습니다</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {detail.links.map((item) => {
            const label =
              item.kind === 'WORK_LOG'
                ? `${formatDay(item.workDate)} 작업 내역, ${settings.data ? formatWork(item.minutes, settings.data) : `${item.minutes}분`}`
                : `${formatDay(item.recordDate)} ${item.name}${item.spec ? ` (${item.spec})` : ''} ${MATERIAL_RECORD_KIND_LABELS[item.recordKind]} ${item.quantity} ${item.unit}`;

            return (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span>{label}</span>
                {editable && (
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`${label} 연결 해제`}
                    disabled={unlink.isPending}
                    onClick={() => {
                      setError('');
                      unlink.mutateAsync(item.id).catch(fail);
                    }}
                  >
                    해제
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-sub">연결한 작업 내역의 공수</dt>
          <dd className="font-bold">
            {settings.data ? formatWork(detail.usage.minutes, settings.data) : '-'} (
            {detail.usage.workLogCount}건)
          </dd>
        </div>
        <div>
          <dt className="text-sub">사용한 자재</dt>
          <dd className="font-bold">
            {detail.usage.materials.length === 0
              ? '없음'
              : detail.usage.materials
                  .map((item) => `${item.name} ${item.quantity}${item.unit}`)
                  .join(', ')}
          </dd>
        </div>
      </dl>
      {editable && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormField label="사후 작업 연결">
              <Select
                value={target}
                placeholder="작업 내역이나 자재 기록 선택"
                onValueChange={setTarget}
                options={[
                  ...logChoices.map((item) => ({
                    value: `log:${item.id}`,
                    label: `${formatDay(item.workDate)} 작업 내역`,
                    group: '작업 내역',
                  })),
                  ...recordChoices.map((item) => ({
                    value: `record:${item.id}`,
                    label: `${formatDay(item.recordDate)} ${materialName(item.materialId)} ${MATERIAL_RECORD_KIND_LABELS[item.kind]} ${item.quantity}`,
                    group: '자재 기록',
                  })),
                ]}
              />
            </FormField>
          </div>
          <Button
            type="button"
            disabled={!target || link.isPending}
            onClick={() => {
              setError('');

              const [kind, id] = target.split(':') as ['log' | 'record', string];

              link
                .mutateAsync(kind === 'log' ? { workLogId: id } : { materialRecordId: id })
                .then(() => setTarget(''))
                .catch(fail);
            }}
          >
            연결
          </Button>
        </div>
      )}
      <p className="text-sm text-sub">
        보수 작업은 작업 내역·자재 기록에서 &quot;사후 작업&quot;으로 표시한 뒤 여기서 연결합니다
      </p>
    </div>
  );
};

const Body = ({
  detail,
  projectId,
  editable,
}: {
  detail: RepairRequestDetail;
  projectId: string;
  editable: boolean;
}) => {
  const [pending, setPending] = useState<RepairStatus | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      {message && <p role="status">{message}</p>}
      <p className="whitespace-pre-wrap">{detail.content}</p>
      <p className="text-sm text-sub">
        접수 {formatDay(detail.receivedOn)}, {detail.requester}
        {detail.location ? `, ${detail.location}` : ''}
        {detail.resolvedOn ? `, 완료 ${formatDay(detail.resolvedOn)}` : ''}
      </p>

      {editable && (
        <div className="flex flex-wrap gap-2">
          {REPAIR_STATUSES.filter((status) => status !== detail.status).map((status) => (
            <Button
              key={status}
              type="button"
              variant="secondary"
              onClick={() => {
                setMessage('');
                setEditing(false);
                setPending(status);
              }}
            >
              {TRANSITION_LABELS[status]}
            </Button>
          ))}
          {canEditRepair(detail.status) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMessage('');
                setPending(null);
                setEditing(true);
              }}
            >
              내용 수정
            </Button>
          )}
        </div>
      )}

      {pending && (
        <StatusForm
          key={`${detail.status}-${pending}`}
          detail={detail}
          to={pending}
          onDone={(done) => {
            setPending(null);
            setMessage(done);
          }}
          onClose={() => setPending(null)}
        />
      )}
      {editing && (
        <EditForm
          detail={detail}
          onDone={() => {
            setEditing(false);
            setMessage('수정했습니다');
          }}
          onClose={() => setEditing(false)}
        />
      )}

      <AfterServiceLinks detail={detail} projectId={projectId} editable={editable} />

      <div className="flex flex-col gap-1">
        <h3 className="font-medium">상태 이력</h3>
        {detail.history.length === 0 ? (
          <p className="text-sm text-sub">상태를 바꾼 적이 없습니다</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {detail.history.map((item) => (
              <li key={item.id}>
                {formatDay(item.effectiveOn)}, {REPAIR_STATUS_LABELS[item.fromStatus]} →{' '}
                <span className="font-bold">{REPAIR_STATUS_LABELS[item.toStatus]}</span>
                {item.note ? `, ${item.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// 보수 요청 한 건: 요약 한 줄과 펼쳐 보는 상세(상태 변경, 수정, 사후 작업 연결, 이력)
export const RepairItem = ({
  repair,
  projectId,
  editable,
}: {
  repair: RepairRequest;
  projectId: string;
  editable: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const detail = useRepairDetail(repair.id, open);

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">#{repair.seq}</span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold">
          {REPAIR_STATUS_LABELS[repair.status]}
        </span>
        {repair.location && <span className="text-sm text-sub">{repair.location}</span>}
        {repair.linkCount > 0 && (
          <span className="text-sm text-sub">사후 작업 {repair.linkCount}건</span>
        )}
      </div>
      <p className="line-clamp-2">{repair.content}</p>
      <p className="text-sm text-sub">
        {formatDay(repair.receivedOn)}, {repair.requester}
      </p>
      <Button
        type="button"
        variant="secondary"
        aria-expanded={open}
        aria-label={`#${repair.seq} ${open ? '접기' : '자세히 보기'}`}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? '접기' : '자세히'}
      </Button>
      {open && detail.isError && <Alert>상세를 불러오지 못했습니다</Alert>}
      {open && !detail.data && !detail.isError && <LoadingBlock label="불러오는 중" />}
      {open && detail.data && (
        <Body detail={detail.data} projectId={projectId} editable={editable} />
      )}
    </li>
  );
};
