import { mkdir, readdir, readFile, rm, stat, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';

import pg from 'pg';

import { withDatabase } from '../src/db/connectionUrl';
import {
  BACKUP_ID_PATTERN,
  DEFAULT_RETENTION_DAYS,
  compareTableCounts,
  findUnprotectedTables,
  formatBackupId,
  selectExpiredBackups,
  sha256File,
  type BackupManifest,
} from '../src/ops/backupPolicy';
import { createPgTools, type PgMode } from '../src/ops/pgTools';

// 백업·복구 시험 CLI: `pnpm backup create | list | prune | drill [백업ID]`
// 접속 정보는 .env의 소유 계정(DATABASE_MIGRATE_URL)을 쓴다. 운영 환경에서는 운영자 PC·점검 작업에서만 실행한다
const ownerUrl = process.env.DATABASE_MIGRATE_URL;
const appUrl = process.env.DATABASE_URL;

if (!ownerUrl || !appUrl) {
  throw new Error('[backup] DATABASE_MIGRATE_URL, DATABASE_URL 필요');
}

const mode: PgMode = process.env.BACKUP_PG_MODE === 'local' ? 'local' : 'docker';
const backupRoot = path.resolve(
  process.env.BACKUP_DIR ?? path.resolve(import.meta.dirname, '../../../backups'),
);
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS);
const database = new URL(ownerUrl).pathname.slice(1);
const tools = createPgTools(mode, ownerUrl);

// 회사와 무관해 RLS가 없는 테이블
const RLS_EXEMPT = ['legal_documents', '_prisma_migrations'];

const withClient = async <T>(url: string, work: (client: pg.Client) => Promise<T>) => {
  const client = new pg.Client({ connectionString: url });

  await client.connect();

  try {
    return await work(client);
  } finally {
    await client.end();
  }
};

const countTables = async (client: pg.Client) => {
  const { rows } = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  const counts: Record<string, number> = {};

  for (const { table_name: table } of rows) {
    const result = await client.query<{ count: string }>(
      `SELECT count(*) FROM ${pg.escapeIdentifier(table)}`,
    );

    counts[table] = Number(result.rows[0]?.count);
  }

  return counts;
};

const readMigrations = async (client: pg.Client) => {
  const { rows } = await client.query<{ count: string; last: string | null }>(
    `SELECT count(*) AS count, max(migration_name) AS last
       FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
  );

  return { count: Number(rows[0]?.count), last: rows[0]?.last ?? null };
};

const listBackupIds = async () => {
  try {
    return (await readdir(backupRoot)).filter((name) => BACKUP_ID_PATTERN.test(name)).sort();
  } catch {
    return [];
  }
};

const createBackup = async () => {
  const id = formatBackupId(new Date());
  const dir = path.join(backupRoot, id);

  await mkdir(dir, { recursive: true });

  const dumpFile = path.join(dir, 'db.dump');
  const client = new pg.Client({ connectionString: ownerUrl });

  await client.connect();

  try {
    // 스냅샷을 내보내 행 수 계산과 덤프가 정확히 같은 시점의 데이터를 보게 함 (그동안 쓰기가 있어도 어긋나지 않음)
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');

    const { rows } = await client.query<{ snapshot: string; version: string }>(
      'SELECT pg_export_snapshot() AS snapshot, version() AS version',
    );
    const { snapshot, version } = rows[0]!;
    const tableCounts = await countTables(client);
    const migrations = await readMigrations(client);

    await tools.run('pg_dump', ['--format=custom', `--snapshot=${snapshot}`], {
      stdoutFile: dumpFile,
    });
    await client.query('COMMIT');

    // 계정(역할) 정의는 데이터베이스 덤프에 포함되지 않아 따로 보관 (비밀번호는 제외, 새 서버에서는 `db:setup`이 다시 설정)
    await tools.run('pg_dumpall', ['--roles-only', '--no-role-passwords'], {
      stdoutFile: path.join(dir, 'roles.sql'),
    });

    const manifest: BackupManifest = {
      version: 1,
      createdAt: new Date().toISOString(),
      database,
      dumpFile: 'db.dump',
      sha256: await sha256File(dumpFile),
      sizeBytes: (await stat(dumpFile)).size,
      serverVersion: version,
      migrations,
      tableCounts,
    };

    await writeFile(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(
      `[backup] 생성 완료 id=${id} 크기=${manifest.sizeBytes}바이트 테이블=${Object.keys(tableCounts).length}개 마이그레이션=${migrations.count}개`,
    );

    return id;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    // 덜 만들어진 백업이 남아 복구에 쓰이지 않도록 폴더째 제거
    await rm(dir, { recursive: true, force: true });
    throw error;
  } finally {
    await client.end();
  }
};

const pruneBackups = async () => {
  const expired = selectExpiredBackups(await listBackupIds(), new Date(), retentionDays);

  for (const id of expired) {
    await rm(path.join(backupRoot, id), { recursive: true, force: true });
  }

  console.log(
    `[backup] 보관 ${retentionDays}일 초과 ${expired.length}개 삭제 ${expired.join(' ')}`.trim(),
  );
};

type DrillCheck = { name: string; ok: boolean; detail?: string };

const runDrill = async (requestedId?: string) => {
  const ids = await listBackupIds();
  const id = requestedId ?? ids.at(-1);

  if (!id || !ids.includes(id)) {
    throw new Error('[backup] 복구 시험할 백업이 없음 (`pnpm backup create`로 먼저 만들기)');
  }

  const dir = path.join(backupRoot, id);
  const manifest = JSON.parse(
    await readFile(path.join(dir, 'manifest.json'), 'utf8'),
  ) as BackupManifest;
  const drillDatabase = `${database}_drill_${Date.now()}`;
  const startedAt = Date.now();
  const checks: DrillCheck[] = [];
  const check = (name: string, problems: string[]) =>
    checks.push({ name, ok: problems.length === 0, detail: problems.join('; ') || undefined });

  // 운영 DB를 덮어쓰지 않도록 임시 DB 이름은 항상 원본과 다르게 만들고, 시험이 끝나면 지움
  if (drillDatabase === database) {
    throw new Error('[backup] 임시 DB 이름이 원본과 같음');
  }

  check(
    '체크섬 일치',
    (await sha256File(path.join(dir, manifest.dumpFile))) === manifest.sha256
      ? []
      : ['덤프 파일이 기록된 체크섬과 다름 (손상 또는 변조)'],
  );

  const admin = withDatabase(ownerUrl, 'postgres');

  await withClient(admin, (client) =>
    client.query(`CREATE DATABASE ${pg.escapeIdentifier(drillDatabase)}`),
  );

  try {
    await tools.run('pg_restore', ['--exit-on-error', '--no-owner'], {
      database: drillDatabase,
      stdinFile: path.join(dir, manifest.dumpFile),
    });

    const restoredUrl = withDatabase(ownerUrl, drillDatabase);

    await withClient(restoredUrl, async (client) => {
      check('행 수 일치', compareTableCounts(manifest.tableCounts, await countTables(client)));

      const migrations = await readMigrations(client);

      check(
        '마이그레이션 일치',
        migrations.count === manifest.migrations.count &&
          migrations.last === manifest.migrations.last
          ? []
          : [
              `백업 ${manifest.migrations.count}개(${manifest.migrations.last}), 복구 ${migrations.count}개(${migrations.last})`,
            ],
      );

      const { rows } = await client.query<{
        table_name: string;
        is_enabled: boolean;
        is_forced: boolean;
      }>(
        `SELECT c.relname AS table_name, c.relrowsecurity AS is_enabled, c.relforcerowsecurity AS is_forced
           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind = 'r'`,
      );

      check(
        '회사 격리(RLS) 유지',
        findUnprotectedTables(
          rows.map((row) => ({
            tableName: row.table_name,
            isEnabled: row.is_enabled,
            isForced: row.is_forced,
          })),
          RLS_EXEMPT,
        ),
      );
    });

    // 앱 계정으로 접속해 격리가 실제로 동작하는지 확인 (회사를 지정하지 않으면 0행, 지정하면 그 회사 행만)
    const sample = await withClient(restoredUrl, async (client) => {
      const { rows } = await client.query<{ company_id: string; total: string; own: string }>(
        `SELECT u.company_id,
                (SELECT count(*) FROM users) AS total,
                (SELECT count(*) FROM users x WHERE x.company_id = u.company_id) AS own
           FROM users u LIMIT 1`,
      );

      return rows[0];
    });

    if (sample) {
      await withClient(withDatabase(appUrl, drillDatabase), async (client) => {
        const none = await client.query<{ count: string }>('SELECT count(*) FROM users');

        await client.query('BEGIN');
        await client.query("SELECT set_config('app.company_id', $1, true)", [sample.company_id]);

        const scoped = await client.query<{ count: string }>('SELECT count(*) FROM users');

        await client.query('ROLLBACK');
        check(
          '앱 계정 격리 동작',
          Number(none.rows[0]?.count) === 0 && Number(scoped.rows[0]?.count) === Number(sample.own)
            ? []
            : [
                `회사 미지정 ${none.rows[0]?.count}행, 지정 ${scoped.rows[0]?.count}행 (기대 0행, ${sample.own}행)`,
              ],
        );
      });
    }
  } finally {
    await withClient(admin, (client) =>
      client.query(`DROP DATABASE IF EXISTS ${pg.escapeIdentifier(drillDatabase)} WITH (FORCE)`),
    );
  }

  const durationMs = Date.now() - startedAt;
  const ok = checks.every((item) => item.ok);
  const record = { drilledAt: new Date().toISOString(), backupId: id, durationMs, ok, checks };

  await mkdir(backupRoot, { recursive: true });
  await appendFile(path.join(backupRoot, 'drill-log.jsonl'), `${JSON.stringify(record)}\n`);

  for (const item of checks) {
    console.log(
      `[backup] ${item.ok ? '통과' : '실패'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`,
    );
  }

  console.log(
    `[backup] 복구 시험 ${ok ? '성공' : '실패'} 백업=${id} 소요=${(durationMs / 1000).toFixed(1)}초`,
  );

  if (!ok) {
    process.exitCode = 1;
  }
};

const [command, argument] = process.argv.slice(2);

switch (command) {
  case 'create':
    await createBackup();
    await pruneBackups();
    break;
  case 'list':
    for (const id of await listBackupIds()) {
      const manifest = JSON.parse(
        await readFile(path.join(backupRoot, id, 'manifest.json'), 'utf8').catch(() => '{}'),
      ) as Partial<BackupManifest>;

      console.log(
        `${id} ${manifest.sizeBytes ?? '?'}바이트 마이그레이션=${manifest.migrations?.count ?? '?'}`,
      );
    }
    break;
  case 'prune':
    await pruneBackups();
    break;
  case 'drill':
    await runDrill(argument);
    break;
  default:
    console.log(
      '사용법: pnpm backup <create|list|prune|drill [백업ID]>\n  create  백업 생성 후 보관 기간이 지난 백업 정리\n  list    백업 목록\n  prune   보관 기간이 지난 백업 삭제\n  drill   최근 백업을 임시 DB에 복구해 검증 (결과는 backups/drill-log.jsonl에 기록)',
    );
}
