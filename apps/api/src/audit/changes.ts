import { EMPLOYEE_STATUS_LABELS, type AuditChange, type WorkLog } from '@field-note/shared';

// 바뀐 항목 설명: 값을 그대로 보이는 항목과, 값은 숨기고 "바뀌었다"만 남기는 항목(개인정보·id)
export type ChangeField = {
  label: string;
  // 값을 보이지 않음 (연락처·생년월일처럼 감사 기록에 복사하지 않는 값, 명부·선택 목록의 id)
  hidden?: boolean;
  // 값을 사람이 읽는 글로 (예: 상태 코드 → 이름)
  format?: (value: unknown) => string;
};

const MAX_TEXT = 80;

const text = (value: unknown, field: ChangeField): string | null => {
  if (value === null || value === undefined || value === '') return null;

  const raw = field.format
    ? field.format(value)
    : Array.isArray(value)
      ? value.join(', ')
      : String(value);

  return raw.length > MAX_TEXT ? `${raw.slice(0, MAX_TEXT)}…` : raw;
};

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null) || (a ?? '') === (b ?? '');

/**
 * @description 수정 요청에서 실제로 바뀐 항목의 전·후를 만든다. 요청에 없는 항목과 같은 값으로 보낸 항목은 뺀다
 * @param before 바꾸기 전 값 (읽지 못했으면 null)
 * @param request 요청 본문 (바꾸려는 값)
 * @param fields 기록할 항목 이름과 보이는 방식
 * @returns 바뀐 내용 (바뀐 것이 없으면 빈 목록)
 */
export const diffChanges = (
  before: Record<string, unknown> | null,
  request: Record<string, unknown>,
  fields: Record<string, ChangeField>,
): AuditChange[] =>
  Object.entries(fields).flatMap(([key, field]) => {
    if (!(key in request)) return [];

    const prev = before?.[key];
    const next = request[key];

    if (before && same(prev, next)) return [];

    return [
      {
        label: field.label,
        before: field.hidden ? null : text(prev, field),
        after: field.hidden ? null : text(next, field),
      },
    ];
  });

// 프로젝트 기본정보 수정에서 기록할 항목 (명부·선택 목록의 id는 이름을 모르므로 바뀌었다는 것만)
export const PROJECT_CHANGE_FIELDS: Record<string, ChangeField> = {
  name: { label: '프로젝트명' },
  siteName: { label: '현장명' },
  siteAddress: { label: '현장 주소' },
  siteMapUrl: { label: '지도 주소' },
  siteContactName: { label: '현장 연락 담당자' },
  siteContactPhone: { label: '현장 연락처', hidden: true },
  accessMemo: { label: '출입·주의 메모' },
  clientId: { label: '고객', hidden: true },
  managerId: { label: '담당자', hidden: true },
  tradeIds: { label: '공종', hidden: true },
  contractDate: { label: '계약일' },
  plannedStart: { label: '시작 예정일' },
  plannedEnd: { label: '종료 예정일' },
  memo: { label: '메모' },
};

// 직원 정보 수정의 기록 항목 (개인정보는 값 복사 제외)
export const EMPLOYEE_CHANGE_FIELDS: Record<string, ChangeField> = {
  name: { label: '이름' },
  title: { label: '직책' },
  status: {
    label: '상태',
    format: (value) =>
      EMPLOYEE_STATUS_LABELS[value as keyof typeof EMPLOYEE_STATUS_LABELS] ?? String(value),
  },
  hiredOn: { label: '입사일' },
  leftOn: { label: '퇴사일' },
  jobTypeId: { label: '직종', hidden: true },
  workerTypeId: { label: '직원 구분', hidden: true },
  birthDate: { label: '생년월일', hidden: true },
  phone: { label: '연락처', hidden: true },
  memo: { label: '메모', hidden: true },
};

/**
 * @description 작업 내역의 활동 기록용 요약 (총 시간과 인원 수)
 * @param log 작업 내역
 */
export const workLogFacts = (log: WorkLog) => ({
  totalMinutes: log.entries.reduce((sum, entry) => sum + entry.minutes, 0),
  people: new Set(log.entries.map((entry) => entry.employeeId)).size,
});

const hoursText = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10}시간`;

/**
 * @description 저장된 작업 내역을 고친 전·후 (시간·인원·작업 내용·구역·특이사항)
 * @param before 고치기 전
 * @param after 고친 뒤
 */
export const workLogChanges = (before: WorkLog, after: WorkLog): AuditChange[] => {
  const a = workLogFacts(before);
  const b = workLogFacts(after);
  const changes: AuditChange[] = [];

  if (a.totalMinutes !== b.totalMinutes) {
    changes.push({
      label: '작업 시간',
      before: hoursText(a.totalMinutes),
      after: hoursText(b.totalMinutes),
    });
  }

  if (a.people !== b.people) {
    changes.push({ label: '작업 인원', before: `${a.people}명`, after: `${b.people}명` });
  }

  for (const [label, from, to] of [
    ['작업 내용', before.content, after.content],
    ['작업 구역', before.area, after.area],
    ['특이사항', before.notes, after.notes],
  ] as const) {
    if ((from ?? '') !== (to ?? '')) {
      changes.push({
        label,
        before: from ? (from.length > MAX_TEXT ? `${from.slice(0, MAX_TEXT)}…` : from) : null,
        after: to ? (to.length > MAX_TEXT ? `${to.slice(0, MAX_TEXT)}…` : to) : null,
      });
    }
  }

  return changes;
};
