import {
  todayInSeoul,
  type Memo,
  type MemoCreate,
  type MemoListQuery,
  type MemosResponse,
  type MemoSummary,
  type MemoUpdate,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class MemoError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[memo.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type MemoService = {
  // 메모 저장. 프로젝트를 정하지 않으면 메모함에 들어감
  create: (companyId: string, userId: string, input: MemoCreate) => Promise<Memo>;
  // 메모함(scope=INBOX) 또는 프로젝트 메모 노트(scope=PROJECT). 날짜 최근순, 커서 방식, 지운 메모는 제외
  list: (companyId: string, query: MemoListQuery) => Promise<MemosResponse>;
  // 정리 안 된 메모함 건수와 끝내지 않은 할 일 건수
  summary: (companyId: string) => Promise<MemoSummary>;
  get: (companyId: string, memoId: string) => Promise<Memo>;
  // 내용·태그·날짜 수정, 프로젝트 연결(메모함 정리)·메모함으로 되돌리기, 할 일 완료 표시
  update: (companyId: string, memoId: string, input: MemoUpdate) => Promise<Memo>;
  // 소프트 삭제
  remove: (companyId: string, memoId: string) => Promise<void>;
};

type Row = Prisma.MemoGetPayload<object>;

const toMemo = (row: Row): Memo => ({
  id: row.id,
  projectId: row.projectId,
  content: row.content,
  tag: row.tag,
  memoDate: row.memoDate.toISOString().slice(0, 10),
  isDone: row.doneAt !== null,
  doneAt: row.doneAt?.toISOString() ?? null,
  createdBy: row.createdBy,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const asDate = (value: string) => new Date(`${value}T00:00:00Z`);

const encodeCursor = (row: Row) =>
  Buffer.from(JSON.stringify([row.memoDate.toISOString().slice(0, 10), row.id])).toString(
    'base64url',
  );

const decodeCursor = (cursor: string): { memoDate: Date; id: string } => {
  try {
    const [memoDate, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as [
      string,
      string,
    ];
    const date = asDate(memoDate);

    if (Number.isNaN(date.getTime()) || typeof id !== 'string') {
      throw new Error('형식 오류');
    }

    return { memoDate: date, id };
  } catch {
    throw new MemoError('INVALID', {
      path: 'query.cursor',
      message: '목록 위치가 올바르지 않습니다',
    });
  }
};

/**
 * @description 프로젝트 메모 노트·메모함 서비스 (앱 계정으로 자기 회사 범위에서만 처리). 프로젝트 없이 먼저 저장하고 나중에 연결할 수 있다 (서비스 기획서 §10.9, §14)
 * @param app 앱 계정 Prisma 클라이언트
 * @param now 현재 시각
 * @returns 메모 서비스
 */
export const createMemoService = (
  app: PrismaClient,
  now: () => Date = () => new Date(),
): MemoService => {
  const requireProject = async (tx: Prisma.TransactionClient, projectId: string, path: string) => {
    if (!(await tx.project.findFirst({ where: { id: projectId } }))) {
      throw new MemoError('INVALID', { path, message: '선택할 수 없는 프로젝트입니다' });
    }
  };

  const findLive = async (tx: Prisma.TransactionClient, memoId: string) => {
    const row = await tx.memo.findFirst({ where: { id: memoId, deletedAt: null } });

    if (!row) {
      throw new MemoError('NOT_FOUND');
    }

    return row;
  };

  return {
    create: async (companyId, userId, input) =>
      toMemo(
        await withCompany(app, companyId, async (tx) => {
          if (input.projectId) {
            await requireProject(tx, input.projectId, 'body.projectId');
          }

          return tx.memo.create({
            data: {
              companyId,
              projectId: input.projectId,
              content: input.content,
              tag: input.tag,
              memoDate: asDate(input.memoDate ?? todayInSeoul(now())),
              createdBy: userId,
            },
          });
        }),
      ),

    list: async (companyId, query) => {
      const cursor = query.cursor ? decodeCursor(query.cursor) : null;
      const rows = await withCompany(app, companyId, async (tx) => {
        if (query.scope === 'PROJECT') {
          if (!(await tx.project.findFirst({ where: { id: query.projectId } }))) {
            throw new MemoError('NOT_FOUND');
          }
        }

        return tx.memo.findMany({
          where: {
            deletedAt: null,
            projectId: query.scope === 'INBOX' ? null : query.projectId,
            tag: query.tag,
            doneAt: query.isDone === undefined ? undefined : query.isDone ? { not: null } : null,
            ...(cursor
              ? {
                  OR: [
                    { memoDate: { lt: cursor.memoDate } },
                    { memoDate: cursor.memoDate, id: { lt: cursor.id } },
                  ],
                }
              : {}),
          },
          orderBy: [{ memoDate: 'desc' }, { id: 'desc' }],
          // 다음 페이지가 있는지 알기 위해 한 건 더 읽음
          take: query.limit + 1,
        });
      });
      const page = rows.slice(0, query.limit);

      return {
        items: page.map(toMemo),
        nextCursor: rows.length > query.limit ? encodeCursor(page[page.length - 1]!) : null,
      };
    },

    summary: (companyId) =>
      withCompany(app, companyId, async (tx) => ({
        inboxCount: await tx.memo.count({ where: { deletedAt: null, projectId: null } }),
        openTodoCount: await tx.memo.count({
          where: { deletedAt: null, tag: 'TODO', doneAt: null },
        }),
      })),

    get: async (companyId, memoId) =>
      toMemo(await withCompany(app, companyId, (tx) => findLive(tx, memoId))),

    update: async (companyId, memoId, input) =>
      toMemo(
        await withCompany(app, companyId, async (tx) => {
          const current = await findLive(tx, memoId);
          const tag = input.tag ?? current.tag;

          if (input.projectId) {
            await requireProject(tx, input.projectId, 'body.projectId');
          }

          if (input.isDone && tag !== 'TODO') {
            throw new MemoError('INVALID', {
              path: 'body.isDone',
              message: '완료 표시는 "할 일" 메모에만 할 수 있습니다',
            });
          }

          // 완료 시각: 완료로 바꿀 때 기록(이미 완료면 유지), 되돌리거나 할 일이 아니게 되면 지움
          let doneAt = current.doneAt;

          if (tag !== 'TODO' || input.isDone === false) {
            doneAt = null;
          } else if (input.isDone && !doneAt) {
            doneAt = now();
          }

          return tx.memo.update({
            where: { companyId_id: { companyId, id: memoId } },
            data: {
              content: input.content,
              tag: input.tag,
              memoDate: input.memoDate ? asDate(input.memoDate) : undefined,
              projectId: input.projectId,
              doneAt,
            },
          });
        }),
      ),

    remove: async (companyId, memoId) => {
      await withCompany(app, companyId, async (tx) => {
        await findLive(tx, memoId);
        await tx.memo.update({
          where: { companyId_id: { companyId, id: memoId } },
          data: { deletedAt: now() },
        });
      });
    },
  };
};
