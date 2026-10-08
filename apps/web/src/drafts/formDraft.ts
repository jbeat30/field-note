// 작성 중인 입력 폼 초안 (서비스 기획서 §14 "임시 저장": 통신이 불안정한 곳에서도 입력이 유실되지 않게 기기에 먼저 저장)
// 서버 저장(임시 저장 상태의 일지)과는 별개로, 저장 버튼을 누르기 전의 입력 내용을 이 기기의 IndexedDB에 둔다
export const DRAFT_MAX_AGE_DAYS = 30;

export type FormDraft<T> = {
  value: T;
  // 초안을 쓰기 시작했을 때 서버에 있던 일지의 버전 (없었으면 null). 그사이 서버 내용이 바뀌었는지 가려내는 기준
  baseVersion: number | null;
  savedAt: string;
};

export type DraftKind = 'workLog' | 'materials';

export const draftKey = (kind: DraftKind, projectId: string, date: string) =>
  `${kind}:${projectId}:${date}`;

/**
 * @description 초안 저장 키에서 종류·프로젝트·날짜를 읽음 (홈의 "이어서 작성" 목록용). 메모 초안처럼 형식이 다른 키는 null
 * @param key 저장 키
 * @returns 종류·프로젝트·날짜 (형식이 다르면 null)
 */
export const parseDraftKey = (key: string) => {
  const [kind, projectId, date, ...rest] = key.split(':');

  if ((kind !== 'workLog' && kind !== 'materials') || !projectId || !date || rest.length > 0) {
    return null;
  }

  return { kind: kind as DraftKind, projectId, date };
};

export const serializeDraft = <T>(draft: FormDraft<T>) => JSON.stringify(draft);

/**
 * @description 저장된 초안 글자를 읽음. 깨졌거나 형식이 다르면 null (초안 때문에 화면이 멈추지 않게)
 * @param raw 저장된 글자
 * @returns 초안 (읽을 수 없으면 null)
 */
export const parseDraft = <T>(raw: string | undefined): FormDraft<T> | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<FormDraft<T>> | null;

    if (
      parsed &&
      typeof parsed === 'object' &&
      'value' in parsed &&
      typeof parsed.savedAt === 'string' &&
      (parsed.baseVersion === null || typeof parsed.baseVersion === 'number')
    ) {
      return parsed as FormDraft<T>;
    }
  } catch {
    // 아래에서 null
  }

  return null;
};

/**
 * @description 오래된 초안을 지움 (기기에 영원히 남지 않게). 일지·자재 초안만 대상이며 메모 초안 같은 다른 글자는 건드리지 않는다
 * @param drafts 저장된 초안 전체
 * @param now 현재 시각
 * @returns 오래된 초안을 뺀 새 객체 (지울 것이 없으면 같은 객체)
 */
export const pruneDrafts = (drafts: Record<string, string>, now: Date) => {
  const limit = now.getTime() - DRAFT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const kept = Object.entries(drafts).filter(([key, raw]) => {
    if (!parseDraftKey(key)) return true;

    const draft = parseDraft<unknown>(raw);

    // 읽을 수 없는 초안도 쓸모가 없으므로 지움
    return draft !== null && new Date(draft.savedAt).getTime() >= limit;
  });

  return kept.length === Object.keys(drafts).length ? drafts : Object.fromEntries(kept);
};

export type ResumableDraft = {
  key: string;
  kind: DraftKind;
  projectId: string;
  date: string;
  savedAt: string;
};

/**
 * @description 홈에서 "이어서 작성"으로 보여 줄 초안 목록 (읽을 수 있는 일지·자재 초안, 최근 저장이 먼저)
 * 같은 프로젝트·날짜의 일지와 자재 초안은 한 줄로 합친다 (같은 화면에서 이어 쓰므로)
 * @param drafts 저장된 초안 전체
 * @returns 이어 쓸 수 있는 초안 (프로젝트·날짜 단위)
 */
export const listResumable = (drafts: Record<string, string>): ResumableDraft[] => {
  const byPlace = new Map<string, ResumableDraft>();

  for (const [key, raw] of Object.entries(drafts)) {
    const parsed = parseDraftKey(key);
    const draft = parsed ? parseDraft<unknown>(raw) : null;

    if (!parsed || !draft) continue;

    const place = `${parsed.projectId}:${parsed.date}`;
    const current = byPlace.get(place);

    // 일지 초안을 대표로 하고(없으면 자재), 저장 시각은 더 최근 것을 씀
    if (!current || draft.savedAt > current.savedAt || parsed.kind === 'workLog') {
      byPlace.set(place, {
        key,
        kind: current?.kind === 'workLog' ? 'workLog' : parsed.kind,
        projectId: parsed.projectId,
        date: parsed.date,
        savedAt: current && current.savedAt > draft.savedAt ? current.savedAt : draft.savedAt,
      });
    }
  }

  return [...byPlace.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
};
