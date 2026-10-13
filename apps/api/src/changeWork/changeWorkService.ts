import {
  changeWorkProjectCheck,
  todayInSeoul,
  validateChangeWorkTransition,
  type ChangeUsage,
  type ChangeWork,
  type ChangeWorkCreate,
  type ChangeWorkDetail,
  type ChangeWorkLink,
  type ChangeWorkStatus,
  type ChangeWorkTransition,
  type ChangeWorkUpdate,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class ChangeWorkError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[changeWork.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type ChangeWorkService = {
  // 프로젝트의 변경·추가 작업 (번호 큰 것이 먼저)
  list: (companyId: string, projectId: string, status?: ChangeWorkStatus) => Promise<ChangeWork[]>;
  get: (companyId: string, id: string) => Promise<ChangeWorkDetail>;
  create: (
    companyId: string,
    userId: string,
    projectId: string,
    input: ChangeWorkCreate,
  ) => Promise<ChangeWorkDetail>;
  // 협의 중일 때만 요청일·요청자·내용을 고칠 수 있음
  update: (companyId: string, id: string, input: ChangeWorkUpdate) => Promise<ChangeWorkDetail>;
  transition: (
    companyId: string,
    userId: string,
    id: string,
    input: ChangeWorkTransition,
  ) => Promise<ChangeWorkDetail>;
  // 증빙: 같은 프로젝트의 문서함 문서를 연결·해제 (해제해도 연결 기록은 남음)
  linkDocument: (
    companyId: string,
    userId: string,
    id: string,
    input: ChangeWorkLink,
  ) => Promise<ChangeWorkDetail>;
  unlinkDocument: (
    companyId: string,
    id: string,
    documentId: string,
    confirmCompleted: boolean,
  ) => Promise<ChangeWorkDetail>;
  // 변경·추가 작업으로 쓴 공수·자재 (작업 내역·자재 기록의 "변경 작업" 표시를 합산)
  usage: (companyId: string, projectId: string) => Promise<ChangeUsage>;
};

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const fromDate = (value: Date) => value.toISOString().slice(0, 10);

const invalid = (path: string, message: string) =>
  new ChangeWorkError('INVALID', { path, message });

type Row = Prisma.ChangeWorkGetPayload<{ include: { project: { select: { status: true } } } }>;

const toSummary = (
  row: Prisma.ChangeWorkGetPayload<object>,
  documentCount: number,
): ChangeWork => ({
  id: row.id,
  projectId: row.projectId,
  seq: row.seq,
  requestedOn: fromDate(row.requestedOn),
  requester: row.requester,
  content: row.content,
  status: row.status,
  statusChangedOn: fromDate(row.statusChangedOn),
  documentCount,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

// 연결이 풀리지 않았고 삭제되지 않은 문서만 증빙으로 센다
const LIVE_LINK = { unlinkedAt: null, document: { deletedAt: null } };

const detailOf = async (tx: Prisma.TransactionClient, id: string): Promise<ChangeWorkDetail> => {
  const row = await tx.changeWork.findFirst({
    where: { id },
    include: {
      statusChanges: { orderBy: [{ changedAt: 'desc' }, { id: 'desc' }] },
      documents: {
        where: LIVE_LINK,
        include: { document: true },
        orderBy: [{ linkedAt: 'desc' }, { id: 'desc' }],
      },
    },
  });

  if (!row) {
    throw new ChangeWorkError('NOT_FOUND');
  }

  return {
    ...toSummary(row, row.documents.length),
    history: row.statusChanges.map((change) => ({
      id: change.id,
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
      effectiveOn: fromDate(change.effectiveOn),
      note: change.note,
      changedAt: change.changedAt.toISOString(),
    })),
    documents: row.documents.map((link) => ({
      documentId: link.documentId,
      title: link.document.title,
      category: link.document.category,
      isSensitive: link.document.isSensitive,
      linkedAt: link.linkedAt.toISOString(),
    })),
  };
};

// 프로젝트 상태에 따라 기록·수정이 막히는지 (§10.3)
const assertProjectAllows = (
  status: Row['project']['status'],
  confirmed: boolean | undefined,
  confirmPath: string,
) => {
  const checked = changeWorkProjectCheck(status, confirmed === true);

  if (!checked.ok) {
    throw invalid(
      checked.path === 'confirmCompleted' ? confirmPath : checked.path,
      checked.message,
    );
  }
};

/**
 * @description 변경·추가 작업 서비스 (앱 계정으로 자기 회사 범위에서만, 삭제 없이 상태·이력으로 표현)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param now 현재 시각 (시험에서 고정)
 * @returns 변경·추가 작업 서비스
 */
export const createChangeWorkService = (
  app: PrismaClient,
  now: () => Date = () => new Date(),
): ChangeWorkService => {
  // 변경 작업 한 건을 프로젝트 상태와 함께 읽음 (없으면 404)
  const findWithProject = async (tx: Prisma.TransactionClient, id: string): Promise<Row> => {
    const row = await tx.changeWork.findFirst({
      where: { id },
      include: { project: { select: { status: true } } },
    });

    if (!row) {
      throw new ChangeWorkError('NOT_FOUND');
    }

    return row;
  };

  return {
    list: (companyId, projectId, status) =>
      withCompany(app, companyId, async (tx) => {
        if (!(await tx.project.findFirst({ where: { id: projectId }, select: { id: true } }))) {
          throw new ChangeWorkError('NOT_FOUND');
        }

        const rows = await tx.changeWork.findMany({
          where: { projectId, ...(status ? { status } : {}) },
          include: { _count: { select: { documents: { where: LIVE_LINK } } } },
          orderBy: [{ seq: 'desc' }],
        });

        return rows.map((row) => toSummary(row, row._count.documents));
      }),

    get: (companyId, id) => withCompany(app, companyId, (tx) => detailOf(tx, id)),

    create: (companyId, userId, projectId, input) =>
      withCompany(app, companyId, async (tx) => {
        // 프로젝트 행을 잠가 같은 프로젝트에 동시에 등록해도 번호가 겹치지 않게 함
        await tx.$queryRaw`SELECT id FROM projects WHERE id = ${projectId}::uuid FOR UPDATE`;

        const project = await tx.project.findFirst({ where: { id: projectId } });

        if (!project) {
          throw new ChangeWorkError('NOT_FOUND');
        }

        assertProjectAllows(project.status, input.confirmCompleted, 'body.confirmCompleted');

        const today = todayInSeoul(now());
        const requestedOn = input.requestedOn ?? today;

        if (requestedOn > today) {
          throw invalid('body.requestedOn', '요청일은 오늘 이후로 정할 수 없습니다');
        }

        const last = await tx.changeWork.aggregate({ where: { projectId }, _max: { seq: true } });
        const created = await tx.changeWork.create({
          data: {
            companyId,
            projectId,
            seq: (last._max.seq ?? 0) + 1,
            requestedOn: toDate(requestedOn),
            requester: input.requester,
            content: input.content,
            statusChangedOn: toDate(requestedOn),
            createdBy: userId,
          },
        });

        return detailOf(tx, created.id);
      }),

    update: (companyId, id, input) =>
      withCompany(app, companyId, async (tx) => {
        const current = await findWithProject(tx, id);

        assertProjectAllows(
          current.project.status,
          input.confirmCompleted,
          'body.confirmCompleted',
        );

        if (current.status !== 'NEGOTIATING') {
          throw invalid(
            'status',
            '협의 중인 기록만 고칠 수 있습니다. 합의·철회된 기록은 그대로 보존됩니다',
          );
        }

        const data: Prisma.ChangeWorkUpdateInput = {};

        if (input.requester !== undefined) data.requester = input.requester;
        if (input.content !== undefined) data.content = input.content;

        if (input.requestedOn !== undefined) {
          const first = await tx.changeWorkStatusChange.findFirst({
            where: { changeWorkId: id },
            orderBy: { effectiveOn: 'asc' },
          });

          if (input.requestedOn > todayInSeoul(now())) {
            throw invalid('body.requestedOn', '요청일은 오늘 이후로 정할 수 없습니다');
          }

          if (first && input.requestedOn > fromDate(first.effectiveOn)) {
            throw invalid(
              'body.requestedOn',
              `요청일은 첫 상태 변경일(${fromDate(first.effectiveOn)})보다 늦을 수 없습니다`,
            );
          }

          data.requestedOn = toDate(input.requestedOn);

          // 상태가 한 번도 바뀐 적 없으면 "현재 상태가 된 날"도 요청일을 따라간다
          if (!first) {
            data.statusChangedOn = toDate(input.requestedOn);
          }
        }

        await tx.changeWork.update({ where: { companyId_id: { companyId, id } }, data });

        return detailOf(tx, id);
      }),

    transition: (companyId, userId, id, input) =>
      withCompany(app, companyId, async (tx) => {
        const current = await findWithProject(tx, id);

        assertProjectAllows(
          current.project.status,
          input.confirmCompleted,
          'body.confirmCompleted',
        );

        const today = todayInSeoul(now());
        const effectiveOn = input.effectiveOn ?? today;
        const note = input.note ?? null;
        const checked = validateChangeWorkTransition({
          from: current.status,
          to: input.toStatus,
          effectiveOn,
          note,
          requestedOn: fromDate(current.requestedOn),
          today,
        });

        if (!checked.ok) {
          throw invalid(`body.${checked.path}`, checked.message);
        }

        // 상태가 그 사이 바뀌지 않았을 때만 갱신해 동시에 두 번 눌러도 이력이 중복되지 않게 함
        const changed = await tx.changeWork.updateMany({
          where: { companyId, id, status: current.status },
          data: { status: input.toStatus, statusChangedOn: toDate(effectiveOn), updatedAt: now() },
        });

        if (changed.count !== 1) {
          throw invalid(
            'body.toStatus',
            '다른 곳에서 상태가 먼저 바뀌었습니다. 새로 고친 뒤 다시 시도해 주세요',
          );
        }

        await tx.changeWorkStatusChange.create({
          data: {
            companyId,
            changeWorkId: id,
            fromStatus: current.status,
            toStatus: input.toStatus,
            effectiveOn: toDate(effectiveOn),
            note,
            changedBy: userId,
          },
        });

        return detailOf(tx, id);
      }),

    linkDocument: (companyId, userId, id, input) =>
      withCompany(app, companyId, async (tx) => {
        const current = await findWithProject(tx, id);

        assertProjectAllows(
          current.project.status,
          input.confirmCompleted,
          'body.confirmCompleted',
        );

        // 같은 프로젝트의 삭제되지 않은 문서만 증빙으로 연결할 수 있다 (다른 회사·다른 프로젝트 문서는 없는 것으로 취급)
        const document = await tx.document.findFirst({
          where: { id: input.documentId, projectId: current.projectId, deletedAt: null },
          select: { id: true },
        });

        if (!document) {
          throw invalid('body.documentId', '선택할 수 없는 문서입니다');
        }

        if (
          await tx.changeWorkDocument.findFirst({
            where: { changeWorkId: id, documentId: input.documentId, unlinkedAt: null },
            select: { id: true },
          })
        ) {
          throw invalid('body.documentId', '이미 연결된 문서입니다');
        }

        await tx.changeWorkDocument.create({
          data: { companyId, changeWorkId: id, documentId: input.documentId, linkedBy: userId },
        });

        return detailOf(tx, id);
      }),

    unlinkDocument: (companyId, id, documentId, confirmCompleted) =>
      withCompany(app, companyId, async (tx) => {
        const current = await findWithProject(tx, id);

        assertProjectAllows(current.project.status, confirmCompleted, 'query.confirmCompleted');

        const unlinked = await tx.changeWorkDocument.updateMany({
          where: { companyId, changeWorkId: id, documentId, unlinkedAt: null },
          data: { unlinkedAt: now() },
        });

        if (unlinked.count === 0) {
          throw new ChangeWorkError('NOT_FOUND');
        }

        return detailOf(tx, id);
      }),

    usage: (companyId, projectId) =>
      withCompany(app, companyId, async (tx) => {
        if (!(await tx.project.findFirst({ where: { id: projectId }, select: { id: true } }))) {
          throw new ChangeWorkError('NOT_FOUND');
        }

        const [logs, minutes, grouped] = await Promise.all([
          tx.workLog.count({ where: { projectId, status: 'SAVED', isChange: true } }),
          tx.workLogEntry.aggregate({
            where: { workLog: { projectId, status: 'SAVED', isChange: true } },
            _sum: { minutes: true },
          }),
          tx.materialRecord.groupBy({
            by: ['materialId'],
            where: { projectId, isChange: true, kind: 'USED' },
            _sum: { quantity: true },
          }),
        ]);
        const materials = await tx.material.findMany({
          where: { id: { in: grouped.map((row) => row.materialId) } },
          select: { id: true, name: true, spec: true, unit: true },
        });

        return {
          workLogCount: logs,
          minutes: minutes._sum.minutes ?? 0,
          materials: grouped
            .flatMap((row) => {
              const material = materials.find((item) => item.id === row.materialId);

              return material
                ? [
                    {
                      materialId: material.id,
                      name: material.name,
                      spec: material.spec,
                      unit: material.unit,
                      quantity: Number(row._sum.quantity ?? 0),
                    },
                  ]
                : [];
            })
            .sort(
              (a, b) =>
                a.name.localeCompare(b.name, 'ko') || a.materialId.localeCompare(b.materialId),
            ),
        };
      }),
  };
};
