import {
  ERROR_MESSAGES,
  WORK_LOG_STATUS_LABELS,
  roundTo,
  checkWorkDate,
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
import { Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { Combobox } from '../components/ui/combobox';
import { Select } from '../components/ui/select';
import { cn } from '../lib/cn';
import { Textarea } from '../components/ui/textarea';
import { draftKey } from '../drafts/formDraft';
import { useLocalDraft } from '../drafts/useLocalDraft';
import { addDays, formatDay } from '../lib/dates';
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
  // 이 날짜보다 앞선 가장 최근 작업 내역의 날짜 ("어제와 동일" 복사용)
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

type SaveResult = {
  status: WorkLogStatus;
  version: number;
  isLate: boolean;
  warnings: WorkLogWarning[];
  autoAssigned: string[];
  extras: { date: string; ok: boolean; message: string }[];
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
  const [extraDates, setExtraDates] = useState<string[]>([]);
  const [extraInput, setExtraInput] = useState('');
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
  const addable = employees.filter(
    (employee) => employee.status !== 'LEFT' && !employeeIds.includes(employee.id),
  );

  const updateLine = (key: string, patch: Partial<EntryLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const setEmployeeIncluded = (employeeId: string, included: boolean) =>
    setLines((current) =>
      current.map((line) => (line.employeeId === employeeId ? { ...line, included } : line)),
    );

  const firstLines = () =>
    employeeIds.map((employeeId) => lines.find((line) => line.employeeId === employeeId)!.key);

  const applyBulkCategory = () => {
    if (!bulkCategory) return;

    const targets = new Set(firstLines());

    setLines((current) =>
      current.map((line) => (targets.has(line.key) ? { ...line, categoryId: bulkCategory } : line)),
    );
  };

  const applyBulkValue = (multiplier: number) => {
    const targets = new Set(firstLines());

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
  const teamMissing = assignedEmployeeIds.filter((employeeId) =>
    addable.some((e) => e.id === employeeId),
  );

  // "어제와 동일": 가장 최근 작업 내역의 공수 항목과 공통 내용을 복사 (퇴사한 직원은 뺌). 저장하기 전에 확인하도록 안내만 한다
  const copyPrevious = async () => {
    if (!previousDate) return;

    setNotice('');

    const previous = await readWorkLog(queryClient, project.id, previousDate);

    if (!previous) {
      setNotice('복사할 작업 내역을 찾지 못했습니다');
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
    setNotice(
      `${formatDay(previousDate)} 작업 내역을 복사했습니다. 내용을 확인한 뒤 저장해 주세요`,
    );
  };

  const addExtraDate = () => {
    const checked = checkWorkDate(extraInput, project, today);

    if (!extraInput || extraInput === date || extraDates.includes(extraInput)) {
      setErrors({ extraDate: '이미 선택했거나 올바르지 않은 날짜입니다' });
      return;
    }

    if (!checked.ok) {
      setErrors({ extraDate: checked.message });
      return;
    }

    setErrors({});
    setExtraDates((current) => [...current, extraInput].sort());
    setExtraInput('');
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
      const extras: SaveResult['extras'] = [];

      // 여러 날짜: 날짜마다 따로 저장하고 결과를 날짜별로 보여 줌 (이미 작업 내역이 있는 날은 건너뜀)
      for (const extra of extraDates) {
        try {
          await save.mutateAsync({ workDate: extra, body });
          extras.push({ date: extra, ok: true, message: '저장했습니다' });
        } catch (error) {
          extras.push({
            date: extra,
            ok: false,
            message:
              getErrorCode(error) === 'CONFLICT'
                ? '이미 작업 내역이 있어 건너뛰었습니다'
                : splitServerErrors(error, FIELDS).root || '저장하지 못했습니다',
          });
        }
      }

      // 서버에 저장되었으므로 기기의 초안은 필요 없음
      draft.clear();
      setRestoredNoticeOpen(false);
      setVersion(saved.version);
      setExtraDates([]);
      setResult({
        status: saved.status,
        version: saved.version,
        isLate: saved.isLate,
        warnings: saved.warnings,
        autoAssigned: saved.autoAssignedEmployeeIds,
        extras,
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
        <h2 className="text-xl font-bold">{formatDay(date)} 작업</h2>
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

      <section
        className="flex flex-col gap-4 rounded-xl bg-surface-subtle p-5"
        aria-labelledby="entries-heading"
      >
        <div>
          <h3 id="entries-heading" className="text-lg font-bold">
            일한 사람과 시간
          </h3>
          <p className="text-sm text-foreground/70">
            사람마다 일한 시간과 한 일의 종류를 따로 정합니다. 안 나온 사람은 체크를 풀어 주세요
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-surface-nested p-4">
          <p className="text-sm font-semibold">모두에게 한 번에 적용</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_MULTIPLIERS.map((quick) => (
              <Button
                key={quick.label}
                type="button"
                variant="secondary"
                onClick={() => applyBulkValue(quick.multiplier)}
              >
                전원 {quick.label} (
                {roundTo((settings.standardWorkMinutes * quick.multiplier) / 60, 1)}
                시간)
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Select
              aria-label="작업 구분 일괄 지정"
              value={bulkCategory}
              onChange={(event) => setBulkCategory(event.target.value)}
            >
              <option value="">무슨 일을 했는지 고르기</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 whitespace-nowrap"
              onClick={applyBulkCategory}
            >
              모두 적용
            </Button>
          </div>
          {previousDate && (
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              onClick={() => void copyPrevious()}
            >
              {previousDate === addDays(date, -1)
                ? '어제와 똑같이 채우기'
                : `${formatDay(previousDate)} 작업과 똑같이 채우기`}
            </Button>
          )}
        </div>

        {lines.length === 0 && (
          <p className="text-sm">
            이 날 일한 직원을 아직 고르지 않았습니다. 아래에서 직원을 골라 추가해 주세요
          </p>
        )}
        <ul className="grid gap-3 xl:grid-cols-2" aria-label="직원별 일한 시간">
          {employeeIds.map((employeeId) => {
            const employee = employeeById.get(employeeId);
            const employeeLines = lines.filter((line) => line.employeeId === employeeId);
            const name = employee?.name ?? '(알 수 없는 직원)';
            const included = employeeLines.every((line) => line.included);
            const personMinutes = employeeLines
              .filter((line) => line.included)
              .reduce((sum, line) => sum + (valueToMinutes(line.value, settings) ?? 0), 0);

            return (
              <li
                key={employeeId}
                className={cn(
                  'flex flex-col gap-3 rounded-xl p-4 ring-1 ring-line',
                  included ? 'bg-surface' : 'bg-surface-nested',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="flex min-h-touch items-center gap-3 font-semibold">
                    <input
                      type="checkbox"
                      className="size-6"
                      aria-label={`${name} 출근`}
                      checked={included}
                      onChange={(event) => setEmployeeIncluded(employeeId, event.target.checked)}
                    />
                    {name}
                    {employee?.title ? (
                      <span className="text-sm font-normal text-foreground/70">
                        ({employee.title})
                      </span>
                    ) : null}
                    {employee?.status === 'ON_LEAVE' && (
                      <span className="text-xs text-danger">휴직</span>
                    )}
                    {employee?.status === 'LEFT' && (
                      <span className="text-xs text-danger">퇴사</span>
                    )}
                  </label>
                  <p className="text-lg font-bold">
                    {included ? `${roundTo(personMinutes / 60, 1)}시간` : '결근·미작업'}
                  </p>
                </div>
                {employeeLines.map((line, index) => {
                  const suffix = index === 0 ? '' : ` ${index + 1}`;
                  const minutes = valueToMinutes(line.value, settings) ?? 0;
                  const step = (deltaMinutes: number) =>
                    updateLine(line.key, {
                      value: minutesToValue(Math.max(30, minutes + deltaMinutes), settings),
                    });

                  return (
                    <div
                      key={line.key}
                      className="flex flex-col gap-2 rounded-lg bg-surface-nested p-3"
                      data-testid="entry-line"
                    >
                      <Select
                        aria-label={`${name} 작업 구분${suffix}`}
                        value={line.categoryId}
                        disabled={!line.included}
                        onChange={(event) =>
                          updateLine(line.key, { categoryId: event.target.value })
                        }
                      >
                        <option value="">무슨 일을 했나요</option>
                        {activeCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                            {category.isActive ? '' : ' (숨김)'}
                          </option>
                        ))}
                      </Select>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          aria-label={`${name} 30분 줄이기${suffix}`}
                          disabled={!line.included}
                          onClick={() => step(-30)}
                        >
                          <Minus aria-hidden className="size-5" />
                        </Button>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="0"
                          className="text-center text-lg font-bold"
                          aria-label={`${name} 일한 시간(시간)${suffix}`}
                          value={line.value}
                          disabled={!line.included}
                          onChange={(event) => updateLine(line.key, { value: event.target.value })}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          aria-label={`${name} 30분 늘리기${suffix}`}
                          disabled={!line.included}
                          onClick={() => step(30)}
                        >
                          <Plus aria-hidden className="size-5" />
                        </Button>
                        <span className="shrink-0 text-sm text-foreground/70">시간</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_MULTIPLIERS.map((quick) => (
                          <Button
                            key={quick.label}
                            type="button"
                            variant="secondary"
                            aria-label={`${name} ${quick.label}${suffix}`}
                            disabled={!line.included}
                            onClick={() =>
                              updateLine(line.key, {
                                value: quickValue(quick.multiplier, settings),
                              })
                            }
                          >
                            {quick.label}
                          </Button>
                        ))}
                        {index === employeeLines.length - 1 && (
                          <Button
                            type="button"
                            variant="secondary"
                            aria-label={`${name} 작업 구분 나누기`}
                            disabled={!included}
                            onClick={() => splitLine(employeeId)}
                          >
                            다른 일도 했어요
                          </Button>
                        )}
                        {employeeLines.length > 1 && (
                          <Button
                            type="button"
                            variant="secondary"
                            aria-label={`${name} 줄 삭제${suffix}`}
                            onClick={() =>
                              setLines((current) => current.filter((item) => item.key !== line.key))
                            }
                          >
                            이 줄 빼기
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </li>
            );
          })}
        </ul>
        {errors.entries && <p className="text-sm text-danger">{errors.entries}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Combobox
            aria-label="직원 추가"
            value=""
            onValueChange={(employeeId) => addEmployees([employeeId])}
            options={[...addable]
              .sort(
                (a, b) =>
                  Number(assignedEmployeeIds.includes(b.id)) -
                  Number(assignedEmployeeIds.includes(a.id)),
              )
              .map((employee) => ({
                value: employee.id,
                label: employee.name,
                description: [
                  assignedEmployeeIds.includes(employee.id) ? '프로젝트 팀' : '',
                  employee.title ?? '',
                  employee.status === 'ON_LEAVE' ? '휴직' : '',
                ]
                  .filter(Boolean)
                  .join(' · '),
              }))}
            placeholder="회사 직원 중에서 추가"
            searchPlaceholder="이름·직책으로 찾기"
            emptyText="추가할 직원이 없습니다"
          />
          {teamMissing.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 whitespace-nowrap"
              onClick={() => addEmployees(teamMissing)}
            >
              프로젝트 팀 {teamMissing.length}명 모두 넣기
            </Button>
          )}
        </div>
      </section>

      <section
        className="flex flex-col gap-4 rounded-xl bg-surface-subtle p-5"
        aria-labelledby="common-heading"
      >
        <h3 id="common-heading" className="text-lg font-bold">
          한 일
        </h3>
        <FormField label="작업 내용" error={errors.content}>
          <Textarea value={content} onChange={(event) => setContent(event.target.value)} />
        </FormField>
        <FormField label="작업 구역" hint="층·호실·동 (선택)">
          <Input value={area} onChange={(event) => setArea(event.target.value)} />
        </FormField>
        <FormField label="날씨·특이사항" hint="선택 (우천 중단, 자재 지연 등)">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </FormField>
        <label className="flex min-h-touch items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={isChange}
            onChange={(event) => setChange(event.target.checked)}
          />
          변경·추가 작업이 포함되어 있습니다
        </label>
      </section>

      <section
        className="flex flex-col gap-2 rounded-xl border border-border bg-surface-subtle p-4"
        aria-labelledby="extra-heading"
      >
        <h3 id="extra-heading" className="text-sm font-bold">
          같은 내용을 다른 날짜에도 저장
        </h3>
        <div className="flex gap-2">
          <DateInput
            aria-label="추가 날짜"
            max={today}
            value={extraInput}
            onChange={(event) => setExtraInput(event.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 whitespace-nowrap"
            onClick={addExtraDate}
          >
            날짜 추가
          </Button>
        </div>
        {errors.extraDate && <p className="text-sm text-danger">{errors.extraDate}</p>}
        {extraDates.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="추가 저장 날짜">
            {extraDates.map((extra) => (
              <li
                key={extra}
                className="flex items-center gap-1 rounded border border-border px-2 py-1 text-sm"
              >
                {formatDay(extra)}
                <button
                  type="button"
                  className="min-h-touch min-w-touch"
                  aria-label={`${extra} 제거`}
                  onClick={() =>
                    setExtraDates((current) => current.filter((item) => item !== extra))
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          {result.extras.length > 0 && (
            <ul className="mt-1 list-disc pl-5" aria-label="추가 날짜 결과">
              {result.extras.map((extra) => (
                <li key={extra.date}>
                  {formatDay(extra.date)}: {extra.message}
                </li>
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
