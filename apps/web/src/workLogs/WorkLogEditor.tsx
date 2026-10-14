import {
  ERROR_MESSAGES,
  WORK_LOG_STATUS_LABELS,
  roundTo,
  workLogStatusCheck,
  type CompanySettings,
  type EmployeeSummary,
  type OptionItem,
  type ProjectDetail,
  type WorkLog,
  type WorkLogStatus,
  type WorkLogWarning,
} from '@field-note/shared';
import { useQueryClient } from '@tanstack/react-query';
import { History, Minus, Plus, Search, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { Modal } from '../components/ui/modal';
import { Select } from '../components/ui/select';
import { cn } from '../lib/cn';
import { Textarea } from '../components/ui/textarea';
import { draftKey } from '../drafts/formDraft';
import { useLocalDraft } from '../drafts/useLocalDraft';
import { formatDay, formatLongDay } from '../lib/dates';
import { getErrorCode } from '../lib/apiError';
import { splitServerErrors } from '../lib/serverErrors';

import {
  QUICK_MULTIPLIERS,
  entriesToLines,
  linesToEntries,
  newLineKey,
  quickValue,
  minutesToValue,
  valueToMinutes,
  type EntryLine,
} from './workLogForm';
import { WorkLogRevisionsPanel } from './WorkLogRevisionsPanel';
import { readWorkLog, useSaveWorkLog } from './useWorkLogs';

const FIELDS = [
  'content',
  'entries',
  'workDate',
  'confirmStatus',
  'isAfterService',
  'status',
  'addMissingAssignments',
] as const;

type Props = {
  project: ProjectDetail;
  date: string;
  log: WorkLog | null;
  settings: CompanySettings;
  employees: readonly EmployeeSummary[];
  // 작업 구분 목록 (숨긴 항목 포함)
  categories: readonly OptionItem[];
  // 그날 투입이 등록된 직원
  assignedEmployeeIds: readonly string[];
  // 이 날짜보다 앞선 가장 최근 작업 내역의 날짜 ("다른 날짜에서 불러오기"의 기본값)
  previousDate: string | null;
  today: string;
  // 서버의 최신 내용으로 화면을 다시 불러옴 (충돌했을 때)
  onReload: () => void;
};

// 작성 중 초안으로 저장하는 폼 값 (화면에서만 쓰는 값은 제외)
type EditorSnapshot = {
  lines: EntryLine[];
  content: string;
  area: string;
  notes: string;
  isChange: boolean;
  isAfterService: boolean;
};

// 비교용 글자: 줄의 임의 키(key)는 빼서, 같은 내용이면 같은 글자가 되게 함
const signatureOf = (snapshot: EditorSnapshot) =>
  JSON.stringify({
    ...snapshot,
    lines: snapshot.lines.map(({ employeeId, categoryId, value, included }) => ({
      employeeId,
      categoryId,
      value,
      included,
    })),
  });

// 입력 단계 하나 (번호·제목·설명·오른쪽 도구). 위에서 아래로 순서대로 채운다
const Step = ({
  number,
  title,
  description,
  aside,
  children,
}: {
  number: number;
  title: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
}) => (
  <section
    className="flex flex-col gap-4 rounded-xl bg-surface-subtle p-4 md:p-5"
    aria-labelledby={`step-${number}`}
  >
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-surface"
        >
          {number}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id={`step-${number}`} className="text-lg font-semibold">
            {title}
          </h3>
          <p className="text-sm text-foreground/65">{description}</p>
        </div>
      </div>
      {aside}
    </header>
    {children}
  </section>
);

// 한 줄의 일한 시간: −30분 · 시간 칸 · +30분 · 반일/하루/연장
const HoursInput = ({
  name,
  suffix = '',
  compact = false,
  line,
  settings,
  onChange,
}: {
  name: string;
  suffix?: string;
  compact?: boolean;
  line: EntryLine;
  settings: CompanySettings;
  onChange: (value: string) => void;
}) => {
  const minutes = valueToMinutes(line.value, settings) ?? 0;
  const step = (delta: number) => onChange(minutesToValue(Math.max(30, minutes + delta), settings));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        variant="secondary"
        size={compact ? 'icon-sm' : 'icon'}
        aria-label={`${name} 30분 줄이기${suffix}`}
        onClick={() => step(-30)}
      >
        <Minus aria-hidden />
      </Button>
      <Input
        type="number"
        inputMode="decimal"
        step="0.5"
        min="0"
        size={compact ? 'sm' : 'md'}
        className={cn('text-center font-semibold tabular-nums', compact ? 'w-16' : 'w-20')}
        aria-label={`${name} 일한 시간(시간)${suffix}`}
        value={line.value}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button
        type="button"
        variant="secondary"
        size={compact ? 'icon-sm' : 'icon'}
        aria-label={`${name} 30분 늘리기${suffix}`}
        onClick={() => step(30)}
      >
        <Plus aria-hidden />
      </Button>
      <span className="text-sm text-foreground/65">시간</span>
      {!compact && (
        <span className="ml-1 flex gap-1">
          {QUICK_MULTIPLIERS.map((quick) => (
            <Button
              key={quick.label}
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`${name} ${quick.label}${suffix}`}
              onClick={() => onChange(quickValue(quick.multiplier, settings))}
            >
              {quick.label}
            </Button>
          ))}
        </span>
      )}
    </div>
  );
};

type SaveResult = {
  status: WorkLogStatus;
  version: number;
  isLate: boolean;
  warnings: WorkLogWarning[];
  autoAssigned: string[];
};

/**
 * @description 작업 내역 일괄 입력 폼: 투입 직원 목록에서 작업 구분·공수를 한 번에 정하고 공통 내용을 한 번 입력한다 (서비스 기획서 §9.3)
 * @param props 프로젝트·날짜·기존 작업 내역과 선택 목록
 */
export const WorkLogEditor = ({
  project,
  date,
  log,
  settings: companySettings,
  employees,
  categories,
  assignedEmployeeIds,
  previousDate,
  today,
  onReload,
}: Props) => {
  const queryClient = useQueryClient();
  const save = useSaveWorkLog(project.id);
  // 작업 입력은 항상 "시간"으로 받는다 (공수 환산은 집계 화면에서만). 회사의 공수 입력 방식 설정과 무관하게 입력은 시간
  const settings = { ...companySettings, workUnitMode: 'HOURS' as const };
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const names = new Map(employees.map((employee) => [employee.id, employee.name]));

  // 서버 내용(또는 투입 직원)만으로 만든 처음 값
  const [initial] = useState<EditorSnapshot>(() => ({
    lines: log ? entriesToLines(log.entries, settings) : [],
    content: log?.content ?? '',
    area: log?.area ?? '',
    notes: log?.notes ?? '',
    isChange: log?.isChange ?? false,
    isAfterService: log?.isAfterService ?? false,
  }));
  // 저장하기 전의 입력을 기기에 자동 임시 저장하고, 다시 열면 복구 (앱을 닫거나 연결이 끊겨도 유실되지 않게)
  const draft = useLocalDraft<EditorSnapshot>({
    key: draftKey('workLog', project.id, date),
    baseVersion: log?.version ?? null,
    initialSignature: signatureOf(initial),
    signatureOf,
  });
  const restored = draft.status === 'restored' ? draft.value : undefined;
  const [lines, setLines] = useState<EntryLine[]>(restored?.lines ?? initial.lines);
  const [content, setContent] = useState(restored?.content ?? initial.content);
  const [area, setArea] = useState(restored?.area ?? initial.area);
  const [notes, setNotes] = useState(restored?.notes ?? initial.notes);
  const [isChange, setChange] = useState(restored?.isChange ?? initial.isChange);
  const [isAfterService, setAfterService] = useState(
    restored?.isAfterService ?? initial.isAfterService,
  );
  // 복구했다는 안내를 보이는 동안(사용자가 닫거나 저장하기 전까지)
  const [isRestoredNoticeOpen, setRestoredNoticeOpen] = useState(draft.status === 'restored');
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [version, setVersion] = useState<number | null>(log?.version ?? null);
  const [bulkCategory, setBulkCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loadOpen, setLoadOpen] = useState(false);
  const [loadDate, setLoadDate] = useState(previousDate ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    status: WorkLogStatus;
    message: string;
  } | null>(null);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<SaveResult | null>(null);

  const applySnapshot = (snapshot: EditorSnapshot) => {
    setLines(snapshot.lines);
    setContent(snapshot.content);
    setArea(snapshot.area);
    setNotes(snapshot.notes);
    setChange(snapshot.isChange);
    setAfterService(snapshot.isAfterService);
  };

  const discardDraft = () => {
    applySnapshot(initial);
    draft.clear();
    setRestoredNoticeOpen(false);
  };

  const snapshot: EditorSnapshot = { lines, content, area, notes, isChange, isAfterService };
  const snapshotSignature = signatureOf(snapshot);

  // 입력이 바뀔 때마다 (잠깐 멈추면) 기기에 저장. 서버 내용과 같아지면 초안을 지움
  useEffect(() => {
    draft.write(snapshot);
    // 값이 바뀐 것만 보면 되므로 비교용 글자에만 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotSignature]);

  const statusAllowed = workLogStatusCheck(project.status, { confirmStatus, isAfterService });
  const needsConfirm = project.status === 'SUSPENDED' || project.status === 'COMPLETED';
  const activeCategories = categories.filter(
    (category) => category.isActive || lines.some((line) => line.categoryId === category.id),
  );
  const employeeIds = [...new Set(lines.map((line) => line.employeeId))];

  const updateLine = (key: string, patch: Partial<EntryLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  // 잘못 추가한 직원을 이 날 기록에서 아예 뺌 (나눈 줄까지 모두)
  const removeEmployee = (employeeId: string) =>
    setLines((current) => current.filter((line) => line.employeeId !== employeeId));

  const firstLines = () =>
    employeeIds.map((employeeId) => lines.find((line) => line.employeeId === employeeId)!.key);

  const applyBulkCategory = () => {
    if (!bulkCategory) return;

    const targets = new Set(firstLines());

    setLines((current) =>
      current.map((line) => (targets.has(line.key) ? { ...line, categoryId: bulkCategory } : line)),
    );
  };

  // 일을 나눠 적은 사람은 일마다 시간을 정했으므로 건드리지 않음
  const applyBulkValue = (multiplier: number) => {
    const targets = new Set(
      employeeIds
        .filter((employeeId) => lines.filter((line) => line.employeeId === employeeId).length === 1)
        .map((employeeId) => lines.find((line) => line.employeeId === employeeId)!.key),
    );

    setLines((current) =>
      current.map((line) =>
        targets.has(line.key) ? { ...line, value: quickValue(multiplier, settings) } : line,
      ),
    );
  };

  const splitLine = (employeeId: string) =>
    setLines((current) => {
      const index = current.map((line) => line.employeeId).lastIndexOf(employeeId);

      return [
        ...current.slice(0, index + 1),
        {
          key: newLineKey(),
          employeeId,
          categoryId: '',
          value: quickValue(0.5, settings),
          included: true,
        },
        ...current.slice(index + 1),
      ];
    });

  const includedLines = lines.filter((line) => line.included);
  const totalMinutes = includedLines.reduce(
    (sum, line) => sum + (valueToMinutes(line.value, settings) ?? 0),
    0,
  );
  const summaryText = `${new Set(includedLines.map((line) => line.employeeId)).size}명 · ${roundTo(totalMinutes / 60, 1)}시간`;
  const addEmployees = (ids: readonly string[]) => {
    const fresh = ids.filter((employeeId) => !employeeIds.includes(employeeId));

    if (fresh.length === 0) return;

    setLines((current) => [
      ...current,
      ...fresh.map((employeeId) => ({
        key: newLineKey(),
        employeeId,
        categoryId: bulkCategory,
        value: quickValue(1, settings),
        included: true,
      })),
    ]);
  };
  const toggleEmployee = (employeeId: string, checked: boolean) =>
    checked ? addEmployees([employeeId]) : removeEmployee(employeeId);

  // 고를 수 있는 직원: 퇴사자는 이미 이 날 기록에 있을 때만. 이 현장 투입 인원이 먼저, 그다음 이름순
  const keyword = search.trim().toLowerCase();
  const pickable = employees
    .filter((employee) => employee.status !== 'LEFT' || employeeIds.includes(employee.id))
    .filter(
      (employee) =>
        !keyword ||
        employee.name.toLowerCase().includes(keyword) ||
        (employee.title ?? '').toLowerCase().includes(keyword),
    )
    .sort(
      (a, b) =>
        Number(assignedEmployeeIds.includes(b.id)) - Number(assignedEmployeeIds.includes(a.id)) ||
        a.name.localeCompare(b.name, 'ko'),
    );

  // 다른 날짜에서 불러오기: 그날의 사람·시간·한 일과 작업 내용을 복사 (퇴사한 직원은 뺌). 저장하기 전에 확인하도록 안내만 한다
  const loadFrom = async (source: string) => {
    if (!source) return;

    setNotice('');
    setLoadOpen(false);

    const previous = await readWorkLog(queryClient, project.id, source);

    if (!previous) {
      setNotice(`${formatDay(source)}에는 작업 내역이 없습니다`);
      return;
    }

    setLines(
      entriesToLines(
        previous.entries.filter((entry) => employeeById.get(entry.employeeId)?.status !== 'LEFT'),
        settings,
      ),
    );
    setContent(previous.content);
    setArea(previous.area ?? '');
    setNotes(previous.notes ?? '');
    setChange(previous.isChange);
    setNotice(`${formatDay(source)} 작업 내역을 불러왔습니다. 내용을 확인한 뒤 저장해 주세요`);
  };

  const doSave = async (status: WorkLogStatus, addMissingAssignments: boolean) => {
    setErrors({});
    setRootError('');
    setConflict(false);
    setPendingAssignment(null);
    setNotice('');
    setResult(null);

    const converted = linesToEntries(lines, settings, names);

    if (!converted.ok) {
      setErrors({ entries: converted.message });
      return;
    }

    const body = {
      status,
      content,
      area: area.trim() || null,
      notes: notes.trim() || null,
      isChange,
      isAfterService,
      entries: converted.entries,
      confirmStatus: needsConfirm ? confirmStatus : undefined,
      addMissingAssignments: addMissingAssignments || undefined,
    };

    try {
      const saved = await save.mutateAsync({
        workDate: date,
        body: { ...body, expectedVersion: version },
      });
      // 서버에 저장되었으므로 기기의 초안은 필요 없음
      draft.clear();
      setRestoredNoticeOpen(false);
      setVersion(saved.version);
      setResult({
        status: saved.status,
        version: saved.version,
        isLate: saved.isLate,
        warnings: saved.warnings,
        autoAssigned: saved.autoAssignedEmployeeIds,
      });
    } catch (error) {
      if (getErrorCode(error) === 'CONFLICT') {
        setConflict(true);
        return;
      }

      const { byField, root } = splitServerErrors(error, FIELDS);

      // 투입 등록이 없는 직원: 자동으로 추가할지 묻는다
      if (byField.addMissingAssignments) {
        setPendingAssignment({ status, message: byField.addMissingAssignments });
        return;
      }

      setErrors(byField);
      setRootError(root);
    }
  };

  const warningText = (warning: WorkLogWarning) => {
    const who = names.get(warning.employeeId) ?? '직원';

    if (warning.type === 'DAILY_OVER') {
      const others = warning.otherProjects.map((item) => `${item.projectName}`).join(', ');

      return `${who}님의 하루 합계가 ${Math.round((warning.totalMinutes / 60) * 10) / 10}시간입니다${others ? ` (다른 프로젝트: ${others})` : ''}`;
    }

    return warning.type === 'ON_LEAVE'
      ? `${who}님은 휴직 중인 직원입니다`
      : `${who}님은 퇴사한 직원입니다`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-xl font-bold">{formatDay(date)} 작업</h2>
        <Button type="button" variant="secondary" size="sm" onClick={() => setLoadOpen(true)}>
          <History aria-hidden />
          다른 날짜에서 불러오기
        </Button>
        {log && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
            {WORK_LOG_STATUS_LABELS[log.status]} · 버전 {version}
          </span>
        )}
        {log?.isLate && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs">지연 입력</span>
        )}
      </div>
      {log?.status === 'DRAFT' && (
        <p className="text-sm text-foreground/70">
          임시 저장은 공수 집계에 반영되지 않습니다. 마무리하면 저장해 주세요
        </p>
      )}

      {!statusAllowed.ok &&
        statusAllowed.path !== 'confirmStatus' &&
        statusAllowed.path !== 'isAfterService' && <Alert>{statusAllowed.message}</Alert>}
      {needsConfirm && (
        <label className="flex min-h-touch items-center gap-2 rounded-md border border-border px-3 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={confirmStatus}
            onChange={(event) => setConfirmStatus(event.target.checked)}
          />
          {project.status === 'SUSPENDED'
            ? '중단 중인 프로젝트에 작업 내역을 쓰는 것을 확인합니다'
            : '완료된 프로젝트에 소급해서 작업 내역을 쓰는 것을 확인합니다'}
        </label>
      )}
      {project.status === 'WARRANTY' && (
        <label className="flex min-h-touch items-center gap-2 rounded-md border border-border px-3 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={isAfterService}
            onChange={(event) => setAfterService(event.target.checked)}
          />
          사후 작업으로 표시합니다 (보증 중에는 필수)
        </label>
      )}

      {conflict && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-danger p-4 text-sm text-danger"
        >
          <p>{ERROR_MESSAGES.CONFLICT}</p>
          <Button type="button" variant="secondary" className="self-start" onClick={onReload}>
            최신 내용 불러오기
          </Button>
        </div>
      )}
      {pendingAssignment && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-border bg-surface-subtle p-4 text-sm"
        >
          <p>{pendingAssignment.message}</p>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void doSave(pendingAssignment.status, true)}>
              투입 추가하고 저장
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPendingAssignment(null)}>
              취소
            </Button>
          </div>
        </div>
      )}
      {rootError && <Alert>{rootError}</Alert>}
      {isRestoredNoticeOpen && draft.status === 'restored' && (
        <Alert variant="info" className="flex flex-col gap-2">
          <span>
            저장하지 않고 닫았던 작성 내용을 복구했습니다
            {draft.savedAt
              ? ` (${new Date(draft.savedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' })})`
              : ''}
          </span>
          <Button type="button" variant="secondary" onClick={discardDraft}>
            복구한 내용 버리기
          </Button>
        </Alert>
      )}
      {draft.status === 'stale' && draft.value && (
        <Alert variant="info" className="flex flex-col gap-2">
          <span>
            이 기기에 저장해 둔 작성 내용이 있지만, 그 뒤에 서버의 작업 내역이 바뀌어 자동으로
            불러오지 않았습니다
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                applySnapshot(draft.value!);
                setNotice(
                  '저장해 둔 내용을 불러왔습니다. 서버의 최신 내용과 비교해 확인한 뒤 저장해 주세요',
                );
              }}
            >
              저장해 둔 내용 불러오기
            </Button>
            <Button type="button" variant="secondary" onClick={draft.clear}>
              버리기
            </Button>
          </div>
        </Alert>
      )}
      {notice && <Alert variant="info">{notice}</Alert>}

      <Modal
        open={loadOpen}
        onOpenChange={setLoadOpen}
        title="다른 날짜에서 불러오기"
        description="고른 날의 일한 사람·시간·한 일과 작업 내용을 이 날로 가져옵니다. 저장하기 전까지는 바뀌지 않습니다"
      >
        <FormField label="불러올 날짜">
          <DateInput
            value={loadDate}
            min={project.plannedStart}
            max={today}
            onChange={(event) => setLoadDate(event.target.value)}
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setLoadOpen(false)}>
            닫기
          </Button>
          <Button type="button" disabled={!loadDate} onClick={() => void loadFrom(loadDate)}>
            불러오기
          </Button>
        </div>
      </Modal>

      <Step
        number={1}
        title="일한 사람"
        description="이 날 이 현장에서 일한 직원을 고르세요"
        aside={
          <span className="text-sm text-foreground/65" aria-live="polite">
            {employeeIds.length}명 선택
          </span>
        }
      >
        {employees.length > 8 && (
          <Input
            size="sm"
            aria-label="직원 찾기"
            placeholder="이름·직책으로 찾기"
            startAdornment={<Search aria-hidden />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:max-w-72"
          />
        )}
        <ul className="grid gap-x-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="회사 직원">
          {pickable.map((employee) => {
            const checked = employeeIds.includes(employee.id);

            return (
              <li key={employee.id}>
                <label
                  className={cn(
                    'flex min-h-12 items-center gap-3 border-b border-line px-1 py-2',
                    checked && 'font-semibold',
                  )}
                >
                  <Checkbox
                    aria-label={`${employee.name} 일함`}
                    checked={checked}
                    onCheckedChange={(next) => toggleEmployee(employee.id, next === true)}
                  />
                  <span className="min-w-0 flex-1 truncate">{employee.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-normal text-foreground/65">
                    {employee.title}
                    {assignedEmployeeIds.includes(employee.id) && (
                      <Badge tone="primary">이 현장</Badge>
                    )}
                    {employee.status === 'ON_LEAVE' && <Badge tone="warning">휴직</Badge>}
                    {employee.status === 'LEFT' && <Badge tone="danger">퇴사</Badge>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {pickable.length === 0 && (
          <p className="text-sm text-foreground/65">찾는 직원이 없습니다</p>
        )}
      </Step>

      <Step
        number={2}
        title="일한 시간"
        description="사람마다 일한 시간을 정하세요. 처음에는 하루(8시간)로 채워집니다"
        aside={
          employeeIds.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-foreground/65">모두</span>
              {QUICK_MULTIPLIERS.map((quick) => (
                <Button
                  key={quick.label}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => applyBulkValue(quick.multiplier)}
                >
                  {quick.label}
                </Button>
              ))}
            </div>
          )
        }
      >
        {employeeIds.length === 0 ? (
          <p className="text-sm text-foreground/65">먼저 일한 사람을 고르세요</p>
        ) : (
          <ul className="flex flex-col" aria-label="직원별 일한 시간">
            {employeeIds.map((employeeId) => {
              const name = names.get(employeeId) ?? '(알 수 없는 직원)';
              const employeeLines = lines.filter((line) => line.employeeId === employeeId);
              const personMinutes = employeeLines.reduce(
                (sum, line) => sum + (valueToMinutes(line.value, settings) ?? 0),
                0,
              );

              return (
                <li
                  key={employeeId}
                  className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0 md:flex-row md:items-center md:gap-4"
                >
                  <p className="font-semibold md:w-32 md:shrink-0">{name}</p>
                  {employeeLines.length === 1 ? (
                    <HoursInput
                      name={name}
                      line={employeeLines[0]!}
                      settings={settings}
                      onChange={(value) => updateLine(employeeLines[0]!.key, { value })}
                    />
                  ) : (
                    <p className="text-sm text-foreground/65">
                      한 일을 나눠 적었습니다 · 합계 {roundTo(personMinutes / 60, 1)}시간 (아래
                      3에서 일마다 시간 입력)
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Step>

      <Step
        number={3}
        title="한 일"
        description="사람마다 무슨 일을 했는지 고르세요. 한 사람이 여러 일을 했으면 나눠서 적습니다"
        aside={
          employeeIds.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Select
                size="sm"
                className="w-44"
                aria-label="작업 구분 일괄 지정"
                value={bulkCategory}
                placeholder="모두 같은 일로"
                onValueChange={setBulkCategory}
                options={activeCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
              <Button type="button" variant="secondary" size="sm" onClick={applyBulkCategory}>
                모두 적용
              </Button>
            </div>
          )
        }
      >
        {employeeIds.length === 0 ? (
          <p className="text-sm text-foreground/65">먼저 일한 사람을 고르세요</p>
        ) : (
          <ul className="flex flex-col" aria-label="직원별 한 일">
            {employeeIds.map((employeeId) => {
              const name = names.get(employeeId) ?? '(알 수 없는 직원)';
              const employeeLines = lines.filter((line) => line.employeeId === employeeId);
              const split = employeeLines.length > 1;

              return (
                <li
                  key={employeeId}
                  className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0 md:flex-row md:items-start md:gap-4"
                >
                  <p className="font-semibold md:w-32 md:shrink-0 md:pt-2">{name}</p>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {employeeLines.map((line, index) => {
                      const suffix = index === 0 ? '' : ` ${index + 1}`;

                      return (
                        <div
                          key={line.key}
                          className="flex flex-wrap items-center gap-2"
                          data-testid="entry-line"
                        >
                          <Select
                            className="min-w-0 flex-1 sm:max-w-64"
                            aria-label={`${name} 작업 구분${suffix}`}
                            value={line.categoryId}
                            placeholder="무슨 일을 했나요"
                            onValueChange={(categoryId) => updateLine(line.key, { categoryId })}
                            options={activeCategories.map((category) => ({
                              value: category.id,
                              label: category.isActive ? category.name : `${category.name} (숨김)`,
                            }))}
                          />
                          {split && (
                            <HoursInput
                              name={name}
                              suffix={suffix}
                              compact
                              line={line}
                              settings={settings}
                              onChange={(value) => updateLine(line.key, { value })}
                            />
                          )}
                          {split && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`${name} 줄 삭제${suffix}`}
                              onClick={() =>
                                setLines((current) =>
                                  current.filter((item) => item.key !== line.key),
                                )
                              }
                            >
                              <X aria-hidden />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="self-start"
                      aria-label={`${name} 작업 구분 나누기`}
                      onClick={() => splitLine(employeeId)}
                    >
                      <Plus aria-hidden />
                      다른 일도 했어요
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {errors.entries && <p className="text-sm text-danger">{errors.entries}</p>}
      </Step>

      <Step
        number={4}
        title={`${formatLongDay(date)} 작업 내용`}
        description="이 날 현장에서 한 일을 적어 두세요"
      >
        <FormField label="작업 내용" error={errors.content}>
          <Textarea value={content} onChange={(event) => setContent(event.target.value)} />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="작업 구역">
            <Input value={area} onChange={(event) => setArea(event.target.value)} />
          </FormField>
          <FormField label="특이사항" hint="예: 비로 오후 작업 중단, 자재 입고 지연">
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </FormField>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <Checkbox checked={isChange} onCheckedChange={(next) => setChange(next === true)} />
          변경·추가 작업이 포함되어 있습니다
        </label>
      </Step>

      {errors.workDate && <Alert>{errors.workDate}</Alert>}
      {errors.confirmStatus && <Alert>{errors.confirmStatus}</Alert>}
      {errors.isAfterService && <Alert>{errors.isAfterService}</Alert>}
      {errors.status && <Alert>{errors.status}</Alert>}

      {result && (
        <Alert variant="info">
          <p>
            {result.status === 'SAVED' ? '저장했습니다' : '임시 저장했습니다'} (버전{' '}
            {result.version})
            {result.isLate ? ' · 작업일에서 오래 지나 지연 입력으로 표시됩니다' : ''}
          </p>
          {result.autoAssigned.length > 0 && (
            <p className="mt-1">
              투입을 자동으로 추가했습니다:{' '}
              {result.autoAssigned.map((id) => names.get(id) ?? '직원').join(', ')}
            </p>
          )}
          {result.warnings.length > 0 && (
            <ul className="mt-1 list-disc pl-5" aria-label="작업 내역 경고">
              {result.warnings.map((warning, index) => (
                <li key={`${warning.type}-${index}`}>{warningText(warning)}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <div className="sticky bottom-20 z-10 flex items-center gap-2 rounded-xl bg-surface p-3 shadow-sheet ring-1 ring-line md:bottom-4">
        <p className="min-w-0 flex-1 text-sm font-semibold" aria-live="polite">
          {summaryText}
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={save.isPending}
          onClick={() => void doSave('DRAFT', false)}
        >
          임시 저장
        </Button>
        <Button type="button" disabled={save.isPending} onClick={() => void doSave('SAVED', false)}>
          저장
        </Button>
      </div>

      {log && log.version > 1 && (
        <WorkLogRevisionsPanel
          projectId={project.id}
          workDate={date}
          employees={employees}
          categories={categories}
        />
      )}
    </div>
  );
};
