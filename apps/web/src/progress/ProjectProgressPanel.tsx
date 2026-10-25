import {
  PROJECT_WARNING_LABELS,
  canRecordProgress,
  minutesToManDays,
  roundTo,
  todayInSeoul,
  type ProjectStatus,
  VALIDATION_MESSAGES,
} from '@field-note/shared';
import { ChevronRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { ProgressBar } from '../components/ui/progress-bar';
import { Section } from '../components/ui/section';
import { StatGroup } from '../components/ui/stat-group';
import { StatusDot } from '../components/ui/status-dot';
import { cn } from '../lib/cn';
import { formatDay } from '../lib/dates';
import { splitServerErrors } from '../lib/serverErrors';
import { useCompanySettings } from '../settings/useCompanySettings';
import { formatWork } from '../workSummary/formatWork';

import { useProgressRecords, useProjectHealth, useRecordProgress } from './useProgress';
import { LoadingBlock } from '../components/ui/loading-block';

// 자주 쓰는 진행률 (한 번 눌러 고름)
const QUICK_PERCENTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

// 진행률 바꾸기 창: 누르기만 하면 되도록 10% 단위 단추 + 직접 입력, 기준일은 오늘
const ProgressDialog = ({
  projectId,
  current,
  onClose,
}: {
  projectId: string;
  current: number | null;
  onClose: () => void;
}) => {
  const record = useRecordProgress(projectId);
  const [percent, setPercent] = useState(current === null ? '' : String(current));
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const value = Number(percent);

    if (percent.trim() === '' || !Number.isInteger(value) || value < 0 || value > 100) {
      setError(VALIDATION_MESSAGES.required('0부터 100 사이의 정수'));
      return;
    }

    void record
      .mutateAsync({ percent: value, recordedOn: todayInSeoul(new Date()) })
      .then(onClose)
      .catch((failure: unknown) => {
        const { byField, root } = splitServerErrors(failure, ['percent', 'recordedOn', 'note']);

        setError(byField.percent ?? byField.recordedOn ?? root);
      });
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="진행률 바꾸기"
      description="오늘 기준으로 기록됩니다"
    >
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate aria-label="진행률 입력">
        <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="진행률 빠른 선택">
          {QUICK_PERCENTS.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={String(value) === percent ? 'primary' : 'secondary'}
              aria-pressed={String(value) === percent}
              onClick={() => setPercent(String(value))}
            >
              {value}%
            </Button>
          ))}
        </div>
        <FormField label="진행률 (%)" error={error}>
          <Input
            placeholder="0에서 100 사이"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            endAdornment="%"
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button type="submit" disabled={record.isPending}>
            {record.isPending ? '기록 중' : '진행률 기록'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * @description 프로젝트 진행 현황: 진행률·공수 소진율·투입 공수를 한 줄로 표시, 진행률은 한 번에 변경
 * 경고(일정보다 뒤처짐 등)는 점 + 글자로 표시, 진행률 이력은 접어 둠
 */
export const ProjectProgressPanel = ({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) => {
  const health = useProjectHealth(projectId);
  const records = useProgressRecords(projectId);
  const settings = useCompanySettings();
  const [editing, setEditing] = useState(false);

  if (health.isError || records.isError || settings.isError) {
    return <Alert>진행 현황을 불러오지 못했습니다</Alert>;
  }

  if (!health.data || !records.data || !settings.data) {
    return <LoadingBlock label="진행 현황을 불러오는 중" />;
  }

  const data = health.data;
  const config = settings.data;
  const burnTone =
    data.burnPercent === null
      ? 'default'
      : data.burnPercent >= 100
        ? 'danger'
        : data.burnPercent >= 80
          ? 'warning'
          : 'default';

  return (
    <Section
      title="진행 현황"
      actions={
        canRecordProgress(status) && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            진행률 바꾸기
          </Button>
        )
      }
    >
      {data.warnings.length > 0 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-1" aria-label="진행 경고">
          {data.warnings.map((warning) => (
            <li key={warning}>
              <StatusDot tone="danger">{PROJECT_WARNING_LABELS[warning]}</StatusDot>
            </li>
          ))}
        </ul>
      )}
      <StatGroup
        items={[
          {
            label: '진행률',
            value: data.progressPercent === null ? '-' : data.progressPercent,
            unit: data.progressPercent === null ? undefined : '%',
            hint: data.progressPercent === null ? '기록 없음' : undefined,
          },
          {
            label: '공수 소진율',
            value: data.burnPercent === null ? '-' : Math.round(data.burnPercent),
            unit: data.burnPercent === null ? undefined : '%',
            hint: data.burnPercent === null ? '계획 공수 없음' : undefined,
            tone: burnTone,
          },
          {
            label: '투입 공수',
            value: roundTo(minutesToManDays(data.usedMinutes, config.standardWorkMinutes), 1),
            unit: 'MD',
            hint:
              data.plannedMinutes === null
                ? `${roundTo(data.usedMinutes / 60, 1)}시간`
                : `계획 ${formatWork(data.plannedMinutes, config)}`,
          },
          {
            label: '끝내려면 필요한 공수',
            value:
              data.forecastMinutes === null
                ? '-'
                : roundTo(minutesToManDays(data.forecastMinutes, config.standardWorkMinutes), 1),
            unit: data.forecastMinutes === null ? undefined : 'MD',
            hint: '지금 속도 기준',
          },
        ]}
      />
      {data.progressPercent !== null && (
        <ProgressBar aria-label="진행률 막대" value={data.progressPercent} />
      )}
      {!canRecordProgress(status) && (
        <p className="text-sm text-sub">이 상태에서는 진행률을 입력할 수 없습니다</p>
      )}

      <details className="group text-sm">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1 font-medium text-foreground/80 [&::-webkit-details-marker]:hidden">
          <ChevronRight
            aria-hidden
            className="size-4 transition-transform duration-(--duration-fast) group-open:rotate-90"
          />
          진행률 이력 ({records.data.length})
        </summary>
        {records.data.length === 0 ? (
          <p className="text-sub">기록이 없습니다</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {records.data.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2">
                <span className="w-28 shrink-0 text-sub">{formatDay(item.recordedOn)}</span>
                <span className={cn('font-semibold tabular-nums')}>{item.percent}%</span>
                {item.note && <span className="text-sub">{item.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </details>

      {editing && (
        <ProgressDialog
          projectId={projectId}
          current={data.progressPercent}
          onClose={() => setEditing(false)}
        />
      )}
    </Section>
  );
};
