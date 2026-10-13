import {
  CREDENTIAL_GAP_LABELS,
  assignmentCreateSchema,
  assignmentStatusCheck,
  assignmentUpdateSchema,
  checkAssignmentPeriod,
  hoursToMinutes,
  manDaysToMinutes,
  minutesToHours,
  minutesToManDays,
  roundTo,
  type Assignment,
  type AssignmentWarning,
  type CompanySettings,
  type ProjectDetail,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { Combobox } from '../components/ui/combobox';
import { useEmployees } from '../employees/useEmployees';
import { splitServerErrors } from '../lib/serverErrors';
import { useCompanySettings } from '../settings/useCompanySettings';

import {
  useAssignments,
  useCancelAssignment,
  useCreateAssignment,
  useUpdateAssignment,
} from './useAssignments';

const FIELDS = [
  'employeeId',
  'startDate',
  'endDate',
  'plannedMinutes',
  'confirmSuspended',
  'projectId',
] as const;

// 계획 공수는 분으로 저장하고, 회사의 공수 입력 방식(비율·시간)과 기준시간으로 환산해 보여 준다
const plannedLabel = (settings: CompanySettings) =>
  settings.workUnitMode === 'HOURS' ? '계획 공수 (시간)' : '계획 공수 (MD)';

const minutesToInput = (minutes: number | null, settings: CompanySettings) => {
  if (minutes === null) return '';

  return String(
    settings.workUnitMode === 'HOURS'
      ? roundTo(minutesToHours(minutes), 2)
      : roundTo(minutesToManDays(minutes, settings.standardWorkMinutes), 2),
  );
};

const inputToMinutes = (value: string, settings: CompanySettings) => {
  if (value.trim() === '') return null;

  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) return Number.NaN;

  return settings.workUnitMode === 'HOURS'
    ? hoursToMinutes(number)
    : manDaysToMinutes(number, settings.standardWorkMinutes);
};

const plannedText = (minutes: number | null, settings: CompanySettings) =>
  minutes === null
    ? '계획 공수 없음'
    : `계획 ${roundTo(minutesToManDays(minutes, settings.standardWorkMinutes), 1)}MD (${roundTo(minutesToHours(minutes), 1)}시간)`;

const warningText = (warning: AssignmentWarning) => {
  if (warning.type === 'OVERLAP') {
    return `${warning.from === warning.to ? warning.from : `${warning.from} ~ ${warning.to}`}에 '${warning.projectName}'(${warning.projectCode})에도 투입되어 있습니다`;
  }

  if (warning.type === 'CREDENTIAL') {
    const label = CREDENTIAL_GAP_LABELS[warning.reason];

    return warning.expiresOn
      ? `필요 자격 '${warning.typeName}': ${label} (만료일 ${warning.expiresOn})`
      : `필요 자격 '${warning.typeName}': ${label}`;
  }

  return warning.type === 'ON_LEAVE' ? '휴직 중인 직원입니다' : '퇴사한 직원입니다';
};

const Warnings = ({ warnings }: { warnings: AssignmentWarning[] }) =>
  warnings.length === 0 ? null : (
    <ul className="flex flex-col gap-1" aria-label="투입 경고">
      {warnings.map((warning, index) => (
        <li
          key={`${warning.type}-${index}`}
          className="rounded border border-danger px-2 py-1 text-xs text-danger"
        >
          ⚠ {warningText(warning)}
        </li>
      ))}
    </ul>
  );

// 투입 한 줄: 직원, 기간, 계획 공수, 경고, 수정·취소
const AssignmentRow = ({
  project,
  assignment,
  employeeName,
  settings,
  locked,
  confirmed,
}: {
  project: ProjectDetail;
  assignment: Assignment;
  employeeName: string;
  settings: CompanySettings;
  locked: boolean;
  confirmed: boolean;
}) => {
  const update = useUpdateAssignment(project.id, assignment.id);
  const cancel = useCancelAssignment(project.id, assignment.id);
  const [mode, setMode] = useState<'view' | 'edit' | 'cancel'>('view');
  const [startDate, setStartDate] = useState(assignment.startDate);
  const [endDate, setEndDate] = useState(assignment.endDate);
  const [planned, setPlanned] = useState(minutesToInput(assignment.plannedMinutes, settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');

  const fail = (error: unknown) => {
    const { byField, root } = splitServerErrors(error, FIELDS);

    setErrors(byField);
    setRootError(root);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');

    const plannedMinutes = inputToMinutes(planned, settings);

    if (Number.isNaN(plannedMinutes)) {
      setErrors({ plannedMinutes: '계획 공수는 0보다 큰 숫자로 입력해 주세요' });
      return;
    }

    const body = {
      startDate,
      endDate,
      plannedMinutes,
      ...(project.status === 'SUSPENDED' ? { confirmSuspended: confirmed } : {}),
    };
    const parsed = assignmentUpdateSchema.safeParse(body);
    const period = checkAssignmentPeriod(startDate, endDate, project);

    if (!parsed.success || !period.ok) {
      setErrors({
        [period.ok ? String(parsed.error?.issues[0]?.path[0] ?? '') : period.path]: period.ok
          ? (parsed.error?.issues[0]?.message ?? '')
          : period.message,
      });
      return;
    }

    void update
      .mutateAsync(parsed.data)
      .then(() => setMode('view'))
      .catch(fail);
  };

  if (mode === 'edit') {
    return (
      <li className="py-3">
        <form
          className="flex flex-col gap-3"
          onSubmit={save}
          noValidate
          aria-label={`${employeeName} 투입 수정`}
        >
          <p className="font-medium">{employeeName} 투입 수정</p>
          {rootError && <Alert>{rootError}</Alert>}
          <FormField label="투입 시작일" error={errors.startDate}>
            <DateInput value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </FormField>
          <FormField label="투입 종료일" error={errors.endDate}>
            <DateInput value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </FormField>
          <FormField
            label={plannedLabel(settings)}
            hint="비우면 계획 공수 없음"
            error={errors.plannedMinutes}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={planned}
              onChange={(event) => setPlanned(event.target.value)}
            />
          </FormField>
          {errors.confirmSuspended && (
            <p className="text-sm text-danger">{errors.confirmSuspended}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={update.isPending}>
              저장
            </Button>
            <Button type="button" variant="secondary" onClick={() => setMode('view')}>
              닫기
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 py-3">
      <div>
        <p className="font-medium">{employeeName}</p>
        <p className="text-sm text-foreground/70">
          {assignment.startDate} ~ {assignment.endDate} ·{' '}
          {plannedText(assignment.plannedMinutes, settings)}
        </p>
      </div>
      <Warnings warnings={assignment.warnings} />
      {mode === 'cancel' ? (
        <div className="flex flex-col gap-2 rounded-xl border border-danger p-4">
          <p className="text-sm">
            {employeeName}님을 팀에서 뺄까요? 이미 기록한 작업은 그대로 남습니다
          </p>
          {rootError && <Alert>{rootError}</Alert>}
          <div className="flex gap-2">
            <Button
              variant="danger"
              disabled={cancel.isPending}
              onClick={() => {
                setRootError('');
                void cancel
                  .mutateAsync(
                    project.status === 'SUSPENDED' ? { confirmSuspended: confirmed } : {},
                  )
                  .catch((error: unknown) =>
                    setRootError(splitServerErrors(error, FIELDS).root || '취소하지 못했습니다'),
                  );
              }}
            >
              빼기 확인
            </Button>
            <Button variant="secondary" onClick={() => setMode('view')}>
              닫기
            </Button>
          </div>
        </div>
      ) : (
        !locked && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              aria-label={`${employeeName} 투입 수정`}
              onClick={() => setMode('edit')}
            >
              기간·계획 수정
            </Button>
            <Button
              variant="secondary"
              aria-label={`${employeeName} 팀에서 빼기`}
              onClick={() => setMode('cancel')}
            >
              팀에서 빼기
            </Button>
          </div>
        )
      )}
    </li>
  );
};

/**
 * @description 프로젝트 투입 패널: 직원을 프로젝트 기간 안에 투입하고(계획 공수 포함), 같은 날 다른 프로젝트와 겹치면 경고 (서비스 기획서 §9.1, §9.4)
 * @param props 프로젝트 기본정보
 */
export const ProjectAssignmentsPanel = ({ project }: { project: ProjectDetail }) => {
  const assignments = useAssignments(project.id);
  const employees = useEmployees({});
  const settings = useCompanySettings();
  const create = useCreateAssignment(project.id);
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(project.plannedStart);
  const [endDate, setEndDate] = useState(project.plannedEnd);
  const [planned, setPlanned] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');
  const [result, setResult] = useState<Assignment | null>(null);

  const statusCheck = assignmentStatusCheck(project.status, confirmed);
  // 완료·보증 중·종료·취소는 투입을 바꿀 수 없음 (중단은 확인 체크 뒤에 가능)
  const locked = !statusCheck.ok && statusCheck.path === 'projectId';
  const names = new Map((employees.data ?? []).map((item) => [item.id, item.name]));
  const assignable = (employees.data ?? []).filter((item) => item.status !== 'LEFT');
  const teamIds = new Set(
    (assignments.data ?? []).filter((item) => !item.cancelledAt).map((item) => item.employeeId),
  );

  if (assignments.isPending || employees.isPending || settings.isPending) {
    return <p className="text-sm">투입을 불러오는 중</p>;
  }

  if (assignments.isError || employees.isError || settings.isError) {
    return <Alert>투입을 불러오지 못했습니다</Alert>;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');
    setResult(null);

    const plannedMinutes = inputToMinutes(planned, settings.data);

    if (Number.isNaN(plannedMinutes)) {
      setErrors({ plannedMinutes: '계획 공수는 0보다 큰 숫자로 입력해 주세요' });
      return;
    }

    // 서버와 같은 공유 규칙으로 먼저 검사해 입력칸 옆에 바로 보여 줌
    const parsed = assignmentCreateSchema.safeParse({
      employeeId,
      startDate,
      endDate,
      plannedMinutes,
      ...(project.status === 'SUSPENDED' ? { confirmSuspended: confirmed } : {}),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];

      setErrors({ [String(issue?.path[0] ?? '')]: issue?.message ?? '' });
      return;
    }

    const period = checkAssignmentPeriod(startDate, endDate, project);

    if (!period.ok) {
      setErrors({ [period.path]: period.message });
      return;
    }

    void create
      .mutateAsync(parsed.data)
      .then((created) => {
        setResult(created);
        setEmployeeId('');
        setPlanned('');
      })
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, FIELDS);

        setErrors(byField);
        setRootError(root || byField.projectId || '');
      });
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="assign-heading">
      <h2 id="assign-heading" className="text-lg font-bold">
        프로젝트 팀
      </h2>
      <p className="text-sm text-foreground/70">
        이 프로젝트에 투입할 회사 직원을 골라 둡니다. 날마다 실제로 나온 사람과 시간은 작업 달력에서
        그날 기록하며, 팀이 아닌 직원도 그날 추가할 수 있습니다
      </p>

      {project.status === 'SUSPENDED' && (
        <label className="flex min-h-touch items-center gap-2 rounded-md border border-border px-3 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          중단 중인 프로젝트의 투입을 바꾸는 것을 확인합니다
        </label>
      )}

      {result && (
        <Alert variant="info">
          <p>
            {names.get(result.employeeId) ?? '직원'}님을 팀에 넣었습니다 ({result.startDate} ~{' '}
            {result.endDate})
          </p>
          {result.warnings.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">확인이 필요합니다</p>
              <Warnings warnings={result.warnings} />
            </div>
          )}
        </Alert>
      )}

      {assignments.data.length === 0 ? (
        <p className="text-sm">아직 팀에 넣은 직원이 없습니다</p>
      ) : (
        <ul className="divide-y divide-border" aria-label="투입 목록">
          {assignments.data.map((assignment) => (
            <AssignmentRow
              key={assignment.id}
              project={project}
              assignment={assignment}
              employeeName={names.get(assignment.employeeId) ?? '(알 수 없는 직원)'}
              settings={settings.data}
              locked={locked}
              confirmed={confirmed}
            />
          ))}
        </ul>
      )}

      {locked ? (
        <p className="text-sm text-foreground/70">
          {!statusCheck.ok ? statusCheck.message : ''}. 투입 기록은 그대로 조회할 수 있습니다
        </p>
      ) : (
        <form
          className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4"
          onSubmit={submit}
          noValidate
          aria-label="팀에 직원 추가"
        >
          <h3 className="text-sm font-bold">팀에 직원 추가</h3>
          {rootError && <Alert>{rootError}</Alert>}
          <FormField label="회사 직원" error={errors.employeeId}>
            <Combobox
              value={employeeId}
              onValueChange={setEmployeeId}
              options={assignable
                .filter((item) => !teamIds.has(item.id))
                .map((item) => ({
                  value: item.id,
                  label: item.name,
                  description: [item.title ?? '', item.status === 'ON_LEAVE' ? '휴직' : '']
                    .filter(Boolean)
                    .join(' · '),
                }))}
              placeholder="직원 선택"
              searchPlaceholder="이름·직책으로 찾기"
              emptyText="추가할 직원이 없습니다"
            />
          </FormField>
          <details className="rounded-lg bg-surface-nested px-3 py-2 text-sm">
            <summary className="min-h-touch cursor-pointer content-center font-medium">
              투입 기간·계획 공수 정하기 (선택, 기본은 프로젝트 전체 기간)
            </summary>
            <div className="mt-2 flex flex-col gap-3 pb-2">
              <FormField label="투입 시작일" error={errors.startDate}>
                <DateInput
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </FormField>
              <FormField label="투입 종료일" error={errors.endDate}>
                <DateInput value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </FormField>
              <FormField
                label={plannedLabel(settings.data)}
                hint="선택 (비우면 계획 공수 없음)"
                error={errors.plannedMinutes}
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={planned}
                  onChange={(event) => setPlanned(event.target.value)}
                />
              </FormField>
            </div>
          </details>
          {errors.confirmSuspended && (
            <p className="text-sm text-danger">{errors.confirmSuspended}</p>
          )}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? '추가 중' : '팀에 추가'}
          </Button>
        </form>
      )}
    </section>
  );
};
