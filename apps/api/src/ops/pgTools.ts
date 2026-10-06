import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

import { withDatabase } from '../db/connectionUrl';

// PostgreSQL 명령줄 도구(pg_dump·pg_restore 등) 실행 방식
// - docker: 로컬 개발. 호스트에 도구가 없어도 되도록 컨테이너 안에서 실행 (소켓 접속이라 비밀번호 불필요)
// - local: 서버에 PostgreSQL 클라이언트 도구가 설치된 경우. 접속 주소로 직접 접속
export type PgMode = 'docker' | 'local';

export type PgTools = {
  mode: PgMode;
  // 도구를 실행하고 표준 출력을 파일로, 표준 입력을 파일에서 연결 (큰 덤프를 메모리에 올리지 않음)
  run: (
    tool: string,
    args: string[],
    options?: { database?: string; stdoutFile?: string; stdinFile?: string },
  ) => Promise<void>;
};

/**
 * @description PostgreSQL 도구 실행기 생성
 * @param mode 실행 방식
 * @param ownerUrl 소유 계정 접속 주소 (`DATABASE_MIGRATE_URL`)
 * @returns 실행기
 */
export const createPgTools = (mode: PgMode, ownerUrl: string): PgTools => {
  const owner = new URL(ownerUrl);
  const username = decodeURIComponent(owner.username);
  const defaultDatabase = owner.pathname.slice(1);

  return {
    mode,
    run: async (tool, args, { database = defaultDatabase, stdoutFile, stdinFile } = {}) => {
      // pg_dumpall은 접속 DB 지정 방식이 달라 호출하는 쪽이 필요한 값만 args에 넘김
      const connection =
        mode === 'docker'
          ? ['-U', username, ...(tool === 'pg_dumpall' ? [] : ['-d', database])]
          : ['--dbname', withDatabase(ownerUrl, database)];
      const [command, commandArgs] =
        mode === 'docker'
          ? ['docker', ['compose', 'exec', '-T', 'postgres', tool, ...connection, ...args]]
          : [tool, [...connection, ...args]];

      const child = spawn(command, commandArgs, {
        stdio: [stdinFile ? 'pipe' : 'ignore', stdoutFile ? 'pipe' : 'inherit', 'pipe'],
      });
      let stderr = '';

      child.stderr?.on('data', (chunk) => {
        stderr += String(chunk);
      });

      const exit = new Promise<void>((resolve, reject) => {
        child.on('error', reject);
        child.on('close', (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`[ops.pgTools] ${tool} 실패 code=${code} ${stderr.trim()}`)),
        );
      });

      await Promise.all([
        exit,
        stdoutFile && child.stdout ? pipeline(child.stdout, createWriteStream(stdoutFile)) : null,
        stdinFile && child.stdin ? pipeline(createReadStream(stdinFile), child.stdin) : null,
      ]);
    },
  };
};
