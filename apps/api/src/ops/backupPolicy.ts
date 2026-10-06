import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

// 백업 보관 기간 기본값(일). 해지한 회사의 데이터도 백업에는 이 기간만큼 남으므로 처리방침의 보관 안내와 맞춰야 한다
export const DEFAULT_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// 백업 폴더 이름 = 생성 시각 (예: 20261006T093000Z). 이 형식이 아닌 폴더는 건드리지 않는다
export const BACKUP_ID_PATTERN = /^\d{8}T\d{6}Z$/;

export type BackupManifest = {
  version: 1;
  createdAt: string;
  database: string;
  dumpFile: string;
  sha256: string;
  sizeBytes: number;
  serverVersion: string;
  // 적용이 끝난 마이그레이션 수와 마지막 이름
  migrations: { count: number; last: string | null };
  // 덤프와 같은 스냅샷에서 센 테이블별 행 수 (복구 시험에서 비교)
  tableCounts: Record<string, number>;
};

export const formatBackupId = (at: Date) =>
  at
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

export const parseBackupId = (id: string): Date | null => {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(id);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
};

/**
 * @description 보관 기간이 지난 백업 선별. 가장 최근 백업은 기간이 지났어도 남긴다 (백업이 끊긴 상태에서 마지막 하나까지 지우지 않기 위함)
 * @param ids 백업 폴더 이름 목록 (형식이 다른 것은 무시)
 * @param now 현재 시각
 * @param retentionDays 보관 기간(일)
 * @returns 삭제 대상 폴더 이름
 */
export const selectExpiredBackups = (ids: string[], now: Date, retentionDays: number): string[] => {
  const backups = ids
    .filter((id) => BACKUP_ID_PATTERN.test(id))
    .sort()
    .reverse();
  const cutoff = now.getTime() - retentionDays * DAY_MS;

  return backups.slice(1).filter((id) => {
    const createdAt = parseBackupId(id);

    return createdAt !== null && createdAt.getTime() < cutoff;
  });
};

/**
 * @description 기록된 행 수와 복구한 DB의 행 수 비교
 * @param expected 백업 시점의 테이블별 행 수
 * @param actual 복구한 DB의 테이블별 행 수
 * @returns 다른 항목 설명 (비어 있으면 일치)
 */
export const compareTableCounts = (
  expected: Record<string, number>,
  actual: Record<string, number>,
): string[] => {
  const differences: string[] = [];

  for (const table of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
    if (expected[table] !== actual[table]) {
      differences.push(
        `${table}: 백업 ${expected[table] ?? '없음'}행, 복구 ${actual[table] ?? '없음'}행`,
      );
    }
  }

  return differences;
};

export type RlsRow = { tableName: string; isEnabled: boolean; isForced: boolean };

/**
 * @description RLS가 켜지고 강제되지 않은 테이블 찾기 (복구 후에도 회사 격리가 살아 있는지 확인)
 * @param rows 테이블별 RLS 상태
 * @param exempt 회사와 무관한 공용 테이블
 * @returns 보호되지 않은 테이블 이름
 */
export const findUnprotectedTables = (rows: RlsRow[], exempt: readonly string[]): string[] =>
  rows
    .filter((row) => !exempt.includes(row.tableName) && !(row.isEnabled && row.isForced))
    .map((row) => row.tableName);

export const sha256File = (file: string) =>
  new Promise<string>((resolve, reject) => {
    const hash = createHash('sha256');

    createReadStream(file)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
