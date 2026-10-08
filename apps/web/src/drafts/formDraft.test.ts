import {
  DRAFT_MAX_AGE_DAYS,
  draftKey,
  listResumable,
  parseDraft,
  parseDraftKey,
  pruneDrafts,
  serializeDraft,
} from './formDraft';

const NOW = new Date('2026-10-08T03:00:00Z');
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
const draft = (savedAt: string) =>
  serializeDraft({ value: { content: '작업' }, baseVersion: null, savedAt });

describe('초안 저장 형식', () => {
  it('저장했다 읽으면 같은 값이 돌아온다', () => {
    const raw = serializeDraft({ value: { a: 1 }, baseVersion: 3, savedAt: daysAgo(0) });

    expect(parseDraft<{ a: number }>(raw)).toEqual({
      value: { a: 1 },
      baseVersion: 3,
      savedAt: daysAgo(0),
    });
  });

  it('깨졌거나 형식이 다른 글자는 null이다', () => {
    for (const raw of [
      undefined,
      '',
      '{깨짐',
      'null',
      '"문자"',
      '{"value":1}',
      '{"value":1,"savedAt":"x","baseVersion":"3"}',
      '메모 글자',
    ]) {
      expect(parseDraft(raw)).toBeNull();
    }
  });

  it('키에서 종류·프로젝트·날짜를 읽고 메모 초안 키는 읽지 않는다', () => {
    expect(parseDraftKey(draftKey('workLog', 'p1', '2026-10-08'))).toEqual({
      kind: 'workLog',
      projectId: 'p1',
      date: '2026-10-08',
    });
    expect(parseDraftKey(draftKey('materials', 'p1', '2026-10-08'))?.kind).toBe('materials');

    for (const key of [
      'memo:inbox',
      'memo:p1',
      'workLog:p1',
      'other:p1:2026-10-08',
      'workLog:p1:2026-10-08:x',
    ]) {
      expect(parseDraftKey(key)).toBeNull();
    }
  });
});

describe('오래된 초안 정리', () => {
  it('기한이 지난 일지·자재 초안만 지우고 최근 초안과 메모 초안은 남긴다', () => {
    const drafts = {
      'workLog:p1:2026-09-01': draft(daysAgo(DRAFT_MAX_AGE_DAYS + 1)),
      'workLog:p1:2026-10-07': draft(daysAgo(1)),
      'materials:p1:2026-09-01': draft(daysAgo(40)),
      'memo:inbox': '아주 오래 전에 쓴 메모 글',
    };

    expect(Object.keys(pruneDrafts(drafts, NOW)).sort()).toEqual([
      'memo:inbox',
      'workLog:p1:2026-10-07',
    ]);
  });

  it('읽을 수 없는 일지 초안은 지우고, 지울 것이 없으면 같은 객체를 돌려준다', () => {
    expect(Object.keys(pruneDrafts({ 'workLog:p1:2026-10-07': '{깨짐' }, NOW))).toEqual([]);

    const clean = { 'workLog:p1:2026-10-07': draft(daysAgo(2)) };

    expect(pruneDrafts(clean, NOW)).toBe(clean);
  });
});

describe('이어서 작성할 초안 목록', () => {
  it('일지·자재 초안을 프로젝트·날짜 단위로 합치고 최근 저장이 먼저 나온다', () => {
    const list = listResumable({
      'workLog:p1:2026-10-07': draft(daysAgo(2)),
      'materials:p1:2026-10-07': draft(daysAgo(1)),
      'materials:p2:2026-10-08': draft(daysAgo(0)),
      'memo:inbox': '메모 글',
      'workLog:p3:2026-10-08': '{깨짐',
    });

    expect(list.map((item) => [item.projectId, item.date, item.kind])).toEqual([
      ['p2', '2026-10-08', 'materials'],
      ['p1', '2026-10-07', 'workLog'],
    ]);
    // 합친 항목의 저장 시각은 둘 중 더 최근
    expect(list[1]!.savedAt).toBe(daysAgo(1));
  });

  it('초안이 없으면 빈 목록이다', () => {
    expect(listResumable({})).toEqual([]);
  });
});
