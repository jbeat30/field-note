import { FILE_STAGED_TTL_SECONDS } from '@field-note/shared';

import {
  expiredFileIds,
  parseStaged,
  pruneStagedDrafts,
  serializeStaged,
  stagedDraftKey,
  type StagedFile,
} from './stagedFiles';

const NOW = new Date('2026-10-22T03:00:00Z');
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString();
const file = (fileId: string, uploadedAt: string): StagedFile => ({
  fileId,
  name: `${fileId}.pdf`,
  size: 10,
  uploadedAt,
});

describe('expiredFileIds', () => {
  it('업로드 후 24시간이 지난 파일만 만료로 본다', () => {
    const files = [
      file('fresh', ago(60)),
      file('edge', ago(FILE_STAGED_TTL_SECONDS)),
      file('old', ago(FILE_STAGED_TTL_SECONDS + 1)),
    ];

    expect(expiredFileIds(files, NOW)).toEqual(['edge', 'old']);
  });
});

describe('parseStaged', () => {
  it('저장한 목록을 그대로 읽는다', () => {
    const files = [file('a', ago(10))];

    expect(parseStaged(serializeStaged(files))).toEqual(files);
  });

  it('없거나 깨진 값과 형식이 다른 항목은 걸러 빈 목록·남은 항목으로 돌려준다', () => {
    expect(parseStaged(undefined)).toEqual([]);
    expect(parseStaged('{깨진')).toEqual([]);
    expect(parseStaged('{"a":1}')).toEqual([]);
    expect(
      parseStaged(
        JSON.stringify([
          file('ok', ago(10)),
          { fileId: 1 },
          { ...file('bad', 'x'), uploadedAt: 'x' },
        ]),
      ),
    ).toEqual([file('ok', ago(10))]);
  });
});

describe('pruneStagedDrafts', () => {
  it('모두 만료된 임시 파일 초안만 지우고 다른 초안은 유지한다', () => {
    const drafts = {
      [stagedDraftKey('old')]: serializeStaged([file('a', ago(FILE_STAGED_TTL_SECONDS + 5))]),
      [stagedDraftKey('mixed')]: serializeStaged([
        file('b', ago(FILE_STAGED_TTL_SECONDS + 5)),
        file('c', ago(5)),
      ]),
      'workLog:p:2026-10-22': 'raw',
    };

    expect(Object.keys(pruneStagedDrafts(drafts, NOW))).toEqual([
      stagedDraftKey('mixed'),
      'workLog:p:2026-10-22',
    ]);
  });

  it('지울 것이 없으면 같은 객체를 돌려준다', () => {
    const drafts = { [stagedDraftKey('x')]: serializeStaged([file('a', ago(5))]) };

    expect(pruneStagedDrafts(drafts, NOW)).toBe(drafts);
  });
});
