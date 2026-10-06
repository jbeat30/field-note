import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  compareTableCounts,
  findUnprotectedTables,
  formatBackupId,
  parseBackupId,
  selectExpiredBackups,
  sha256File,
} from './backupPolicy';

describe('백업 폴더 이름', () => {
  it('시각을 이름으로 만들고 다시 읽는다', () => {
    const at = new Date('2026-10-06T09:30:05.123Z');

    expect(formatBackupId(at)).toBe('20261006T093005Z');
    expect(parseBackupId('20261006T093005Z')?.toISOString()).toBe('2026-10-06T09:30:05.000Z');
    expect(parseBackupId('latest')).toBeNull();
  });
});

describe('보관 기간', () => {
  const now = new Date('2026-10-31T00:00:00Z');

  it('기간이 지난 백업만 고르고 형식이 다른 폴더는 건드리지 않는다', () => {
    const ids = [
      '20260901T000000Z',
      '20261001T000000Z',
      '20261020T000000Z',
      'notes',
      '20261030T000000Z',
    ];

    expect(selectExpiredBackups(ids, now, 30)).toEqual(['20260901T000000Z']);
  });

  it('모두 기간이 지나도 가장 최근 백업 하나는 남긴다', () => {
    const ids = ['20260101T000000Z', '20260201T000000Z', '20260301T000000Z'];

    expect(selectExpiredBackups(ids, now, 30)).toEqual(['20260201T000000Z', '20260101T000000Z']);
  });

  it('입력 순서와 상관없이 같은 결과를 낸다', () => {
    const ids = ['20260901T000000Z', '20260801T000000Z'];

    expect(selectExpiredBackups(ids, now, 30)).toEqual(
      selectExpiredBackups([...ids].reverse(), now, 30),
    );
  });
});

describe('복구 검증', () => {
  it('행 수가 다르거나 테이블이 빠지면 알려 준다', () => {
    expect(compareTableCounts({ users: 4, memos: 0 }, { users: 4, memos: 0 })).toEqual([]);
    expect(compareTableCounts({ users: 4, memos: 2 }, { users: 3 })).toEqual([
      'users: 백업 4행, 복구 3행',
      'memos: 백업 2행, 복구 없음행',
    ]);
  });

  it('RLS가 꺼졌거나 강제되지 않은 테이블을 찾고 공용 테이블은 제외한다', () => {
    const rows = [
      { tableName: 'users', isEnabled: true, isForced: true },
      { tableName: 'memos', isEnabled: true, isForced: false },
      { tableName: 'projects', isEnabled: false, isForced: false },
      { tableName: 'legal_documents', isEnabled: false, isForced: false },
    ];

    expect(findUnprotectedTables(rows, ['legal_documents'])).toEqual(['memos', 'projects']);
  });
});

describe('체크섬', () => {
  it('파일 내용이 바뀌면 값이 달라진다', async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'backup-')), 'db.dump');

    writeFileSync(file, 'abc');

    const first = await sha256File(file);

    writeFileSync(file, 'abd');

    expect(first).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(await sha256File(file)).not.toBe(first);
  });
});
