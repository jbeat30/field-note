import {
  PROGRESS_NOTE_MAX_LENGTH,
  PROJECT_WARNING_LABELS,
  canRecordProgress,
  todayInSeoul,
  type ProjectStatus,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { formatDay } from '../lib/dates';
import { splitServerErrors } from '../lib/serverErrors';
import { useCompanySettings } from '../settings/useCompanySettings';
import { formatWork } from '../workSummary/formatWork';

import { useProgressRecords, useProjectHealth, useRecordProgress } from './useProgress';

const ProgressForm = ({ projectId }: { projectId: string }) => {
  const record = useRecordProgress(projectId);
  const today = todayInSeoul(new Date());
  const [percent, setPercent] = useState('');
  const [recordedOn, setRecordedOn] = useState(today);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');

    const value = Number(percent);

    if (percent.trim() === '' || !Number.isInteger(value) || value < 0 || value > 100) {
      setErrors({ percent: '0부터 100 사이의 정수를 입력해 주세요' });
      return;
    }

    void record
      .mutateAsync({ percent: value, recordedOn, ...(note.trim() ? { note: note.trim() } : {}) })
      .then(() => {
        setPercent('');
        setNote('');
        setRecordedOn(today);
      })
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, ['percent', 'recordedOn', 'note']);

        setErrors(byField);
        setRootError(root);
      });
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate aria-label="진행률 입력">
      {rootError && <Alert>{rootError}</Alert>}
      <div className="grid grid-cols-2 gap-2">
        <FormField label="진행률 (%)" error={errors.percent}>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
          />
        </FormField>
        <FormField label="기준일" error={errors.recordedOn}>
          <Input
            type="date"
            max={today}
            value={recordedOn}
            onChange={(event) => setRecordedOn(event.target.value)}
          />
        </FormField>
      </div>
      <FormField label="메모 (선택)" error={errors.note}>
        <Input
          maxLength={PROGRESS_NOTE_MAX_LENGTH}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </FormField>
      <Button type="submit" disabled={record.isPending}>
        {record.isPending ? '기록 중' : '진행률 기록'}
      </Button>
    </form>
  );
};

// 진행 점검 (서비스 기획서 §10.4): 진행률 입력·이력, 공수 소진율, 현재 속도로 끝낼 때 필요한 공수, 경고
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

  if (health.isError || records.isError || settings.isError) {
    return <Alert>진행 현황을 불러오지 못했습니다</Alert>;
  }

  if (!health.data || !records.data || !settings.data) {
    return <p className="text-sm">진행 현황을 불러오는 중</p>;
  }

  const data = health.data;
  const config = settings.data;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="progress-heading">
      <h2 id="progress-heading" className="text-lg font-bold">
        진행 현황
      </h2>

      {data.warnings.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="진행 경고">
          {data.warnings.map((warning) => (
            <li key={warning} className="rounded-md bg-danger-subtle px-3 py-2 text-danger">
              {PROJECT_WARNING_LABELS[warning]}
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-foreground/70">진행률</dt>
          <dd className="font-bold">
            {data.progressPercent === null ? '기록 없음' : `${data.progressPercent}%`}
          </dd>
        </div>
        <div>
          <dt className="text-foreground/70">공수 소진율</dt>
          <dd className="font-bold">
            {data.burnPercent === null ? '계획 없음' : `${Math.round(data.burnPercent)}%`}
          </dd>
        </div>
        <div>
          <dt className="text-foreground/70">투입 공수</dt>
          <dd className="font-bold">{formatWork(data.usedMinutes, config)}</dd>
        </div>
        <div>
          <dt className="text-foreground/70">계획 공수</dt>
          <dd className="font-bold">
            {data.plannedMinutes === null ? '계획 없음' : formatWork(data.plannedMinutes, config)}
          </dd>
        </div>
        {data.forecastMinutes !== null && (
          <div className="col-span-2">
            <dt className="text-foreground/70">현재 속도로 끝내려면 필요한 공수</dt>
            <dd className="font-bold">{formatWork(data.forecastMinutes, config)}</dd>
          </div>
        )}
      </dl>

      {canRecordProgress(status) ? (
        <ProgressForm projectId={projectId} />
      ) : (
        <p className="text-sm text-foreground/70">이 상태에서는 진행률을 입력할 수 없습니다</p>
      )}

      <div className="flex flex-col gap-1">
        <h3 className="font-medium">진행률 이력</h3>
        {records.data.length === 0 ? (
          <p className="text-sm text-foreground/70">기록이 없습니다</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {records.data.map((item) => (
              <li key={item.id}>
                {formatDay(item.recordedOn)} · <span className="font-bold">{item.percent}%</span>
                {item.note ? ` · ${item.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
