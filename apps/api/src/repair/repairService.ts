import {
  isRepairOpen,
  canEditRepair,
  repairProjectCheck,
  todayInSeoul,
  validateRepairTransition,
  type RepairCreate,
  type RepairLink,
  type RepairLinkItem,
  type RepairRequest,
  type RepairRequestDetail,
  type RepairStatus,
  type RepairTransition,
  type RepairUpdate,
  type RepairUsage,
} from '@field-note/shared';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export class RepairError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID',
    // INVALID일 때 어느 입력이 왜 잘못됐는지 (값은 담지 않음)
    readonly detail?: { path: string; message: string },
  ) {
    super(`[repair.service] ${code}${detail ? ` ${detail.path}` : ''}`);
  }
}

export type RepairService = {
  // 프로젝트의 보수 요청 (번호 큰 것이 먼저)
  list: (companyId: string, projectId: string, status?: RepairStatus) => Promise<RepairRequest[]>;
  get: (companyId: string, id: string) => Promise<RepairRequestDetail>;
  create: (
    companyId: string,
    userId: string,
    projectId: string,
    input: RepairCreate,
  ) => Promise<RepairRequestDetail>;
  // 완료 전까지만 접수일·요청자·내용·위치를 고칠 수 있음
  update: (companyId: string, id: string, input: RepairUpdate) => Promise<RepairRequestDetail>;
  transition: (
    companyId: string,
    userId: string,
    id: string,
    input: RepairTransition,
  ) => Promise<RepairRequestDetail>;
  // 사후 작업으로 표시한 같은 프로젝트의 작업 내역·자재 기록을 연결·해제 (해제해도 연결 기록은 남음)
  link: (
    companyId: string,
    userId: string,
    id: string,
    input: RepairLink,
  ) => Promise<RepairRequestDetail>;
  unlink: (companyId: string, id: string, linkId: string) => Promise<RepairRequestDetail>;
  // 프로젝트에서 사후 작업으로 표시한 작업 내역의 공수·자재 사용량 합계 (연결 여부와 무관)
  afterServiceUsage: (companyId: string, projectId: string) => Promise<RepairUsage>;
};

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const fromDate = (value: Date) => value.toISOString().slice(0, 10);

const invalid = (path: string, message: string) => new RepairError('INVALID', { path, message });

/**
 * @description 종료 전환이 읽는 보수 요청 건수: 접수·처리 중(종료를 막음)과 보류 중(안내만)
 * @param tx 회사 범위 트랜잭션
 * @param projectId 프로젝트
 * @returns 미처리·보류 건수
 */
export const loadRepairCounts = async (tx: Prisma.TransactionClient, projectId: string) => {
  const grouped = await tx.repairRequest.groupBy({
    by: ['status'],
    where: { projectId, status: { not: 'DONE' } },
    _count: { _all: true },
  });
  const countOf = (predicate: (status: RepairStatus) => boolean) =>
    grouped.filter((row) => predicate(row.status)).reduce((sum, row) => sum + row._count._all, 0);

  return { open: countOf(isRepairOpen), hold: countOf((status) => status === 'ON_HOLD') };
};

const toSummary = (
  row: Prisma.RepairRequestGetPayload<object>,
  linkCount: number,
): RepairRequest => ({
  id: row.id,
  projectId: row.projectId,
  seq: row.seq,
  receivedOn: fromDate(row.receivedOn),
  requester: row.requester,
  content: row.content,
  location: row.location,
  status: row.status,
  statusChangedOn: fromDate(row.statusChangedOn),
  resolvedOn: row.resolvedOn ? fromDate(row.resolvedOn) : null,
  linkCount,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

// 삭제되지 않은 자재 기록·저장된 작업 내역에 걸린 연결만 집계
const LIVE_TARGET = {
  unlinkedAt: null,
  OR: [{ workLog: { status: 'SAVED' as const } }, { materialRecord: { deletedAt: null } }],
};

const detailOf = async (tx: Prisma.TransactionClient, id: string): Promise<RepairRequestDetail> => {
  const row = await tx.repairRequest.findFirst({
    where: { id },
    include: {
      statusChanges: { orderBy: [{ changedAt: 'desc' }, { id: 'desc' }] },
      links: {
        where: LIVE_TARGET,
        include: {
          workLog: { include: { entries: { select: { minutes: true } } } },
          materialRecord: { include: { material: true } },
        },
        orderBy: [{ linkedAt: 'asc' }, { id: 'asc' }],
      },
    },
  });

  if (!row) {
    throw new RepairError('NOT_FOUND');
  }

  const links = row.links.flatMap((link): RepairLinkItem[] => {
    if (link.workLog) {
      return [
        {
          kind: 'WORK_LOG',
          id: link.id,
          workLogId: link.workLog.id,
          workDate: fromDate(link.workLog.workDate),
          content: link.workLog.content,
          minutes: link.workLog.entries.reduce((sum, entry) => sum + entry.minutes, 0),
          linkedAt: link.linkedAt.toISOString(),
        },
      ];
    }

    if (link.materialRecord) {
      return [
        {
          kind: 'MATERIAL',
          id: link.id,
          materialRecordId: link.materialRecord.id,
          recordDate: fromDate(link.materialRecord.recordDate),
          name: link.materialRecord.material.name,
          spec: link.materialRecord.material.spec,
          unit: link.materialRecord.material.unit,
          recordKind: link.materialRecord.kind,
          quantity: Number(link.materialRecord.quantity),
          linkedAt: link.linkedAt.toISOString(),
        },
      ];
    }

    return [];
  });
  // 연결한 작업 내역의 공수 합과 사용(USED) 자재 합
  const materials = new Map<string, RepairUsage['materials'][number]>();

  for (const link of row.links) {
    const record = link.materialRecord;

    if (record && record.kind === 'USED') {
      const existing = materials.get(record.materialId);

      materials.set(record.materialId, {
        materialId: record.materialId,
        name: record.material.name,
        spec: record.material.spec,
        unit: record.material.unit,
        quantity: (existing?.quantity ?? 0) + Number(record.quantity),
      });
    }
  }

  return {
    ...toSummary(row, links.length),
    history: row.statusChanges.map((change) => ({
      id: change.id,
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
      effectiveOn: fromDate(change.effectiveOn),
      note: change.note,
      changedAt: change.changedAt.toISOString(),
    })),
    links,
    usage: {
      workLogCount: links.filter((link) => link.kind === 'WORK_LOG').length,
      minutes: links.reduce((sum, link) => sum + (link.kind === 'WORK_LOG' ? link.minutes : 0), 0),
      materials: [...materials.values()].sort(
        (a, b) => a.name.localeCompare(b.name, 'ko') || a.materialId.localeCompare(b.materialId),
      ),
    },
  };
};

/**
 * @description 보수 요청 서비스 (앱 계정으로 자기 회사 범위에서만, 삭제 없이 상태·이력으로 표현)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @param now 현재 시각 (시험에서 고정)
 * @returns 보수 요청 서비스
 */
export const createRepairService = (
  app: PrismaClient,
  now: () => Date = () => new Date(),
): RepairService => {
  // 보수 요청 한 건을 프로젝트 상태와 함께 읽음 (없으면 404)
  const findWithProject = async (tx: Prisma.TransactionClient, id: string) => {
    const row = await tx.repairRequest.findFirst({
      where: { id },
      include: { project: { select: { status: true } } },
    });

    if (!row) {
      throw new RepairError('NOT_FOUND');
    }

    return row;
  };

  const assertProjectAllows = (status: Prisma.ProjectGetPayload<object>['status']) => {
    const checked = repairProjectCheck(status);

    if (!checked.ok) {
      throw invalid(`body.${checked.path}`, checked.message);
    }
  };

  return {
    list: (companyId, projectId, status) =>
      withCompany(app, companyId, async (tx) => {
        if (!(await tx.project.findFirst({ where: { id: projectId }, select: { id: true } }))) {
          throw new RepairError('NOT_FOUND');
        }

        const rows = await tx.repairRequest.findMany({
          where: { projectId, ...(status ? { status } : {}) },
          include: { _count: { select: { links: { where: LIVE_TARGET } } } },
          orderBy: [{ seq: 'desc' }],
        });

        return rows.map((row) => toSummary(row, row._count.links));
      }),

    get: (companyId, id) => withCompany(app, companyId, (tx) => detailOf(tx, id)),

    create: (companyId, userId, projectId, input) =>
      withCompany(app, companyId, async (tx) => {
        // 프로젝트 행을 잠가 같은 프로젝트에 동시에 접수해도 번호가 겹치지 않게 함
        await tx.$queryRaw`SELECT id FROM projects WHERE id = ${projectId}::uuid FOR UPDATE`;

        const project = await tx.project.findFirst({ where: { id: projectId } });

        if (!project) {
          throw new RepairError('NOT_FOUND');
        }

        assertProjectAllows(project.status);

        const today = todayInSeoul(now());
        const receivedOn = input.receivedOn ?? today;

        if (receivedOn > today) {
          throw invalid('body.receivedOn', '접수일은 오늘 이후로 입력할 수 없습니다');
        }

        const last = await tx.repairRequest.aggregate({
          where: { projectId },
          _max: { seq: true },
        });
        const created = await tx.repairRequest.create({
          data: {
            companyId,
            projectId,
            seq: (last._max.seq ?? 0) + 1,
            receivedOn: toDate(receivedOn),
            requester: input.requester,
            content: input.content,
            location: input.location?.trim() || null,
            statusChangedOn: toDate(receivedOn),
            createdBy: userId,
          },
        });

        return detailOf(tx, created.id);
      }),

    update: (companyId, id, input) =>
      withCompany(app, companyId, async (tx) => {
        const current = await findWithProject(tx, id);

        assertProjectAllows(current.project.status);

        if (!canEditRepair(current.status)) {
          throw invalid(
            'body.content',
            '완료된 보수 요청은 고칠 수 없습니다. 처리 중으로 되돌린 뒤 수정해 주세요',
          );
        }

        if (input.receivedOn !== undefined) {
          if (input.receivedOn > todayInSeoul(now())) {
            throw invalid('body.receivedOn', '접수일은 오늘 이후로 입력할 수 없습니다');
          }

          if (input.receivedOn > fromDate(current.statusChangedOn)) {
            throw invalid('body.receivedOn', '접수일은 현재 상태가 된 날보다 늦을 수 없습니다');
          }
        }

        await tx.repairRequest.update({
          where: { companyId_id: { companyId, id } },
          data: {
            ...(input.receivedOn === undefined ? {} : { receivedOn: toDate(input.receivedOn) }),
            ...(input.requester === undefined ? {} : { requester: input.requester }),
            ...(input.content === undefined ? {} : { content: input.content }),
            ...(input.location === undefined ? {} : { location: input.location?.trim() || null }),
            updatedAt: now(),
          },
        });

        return detailOf(tx, id);
      }),

    transition: (companyId, userId, id, input) =>
      withCompany(app, companyId, async (tx) => {
        const current = await findWithProject(tx, id);

        assertProjectAllows(current.project.status);

        const today = todayInSeoul(now());
        const effectiveOn = input.effectiveOn ?? today;
        const note = input.note?.trim() || null;
        const checked = validateRepairTransition({
          from: current.status,
          to: input.toStatus,
          effectiveOn,
          note,
          receivedOn: fromDate(current.receivedOn),
          today,
        });

        if (!checked.ok) {
          throw invalid(`body.${checked.path}`, checked.message);
        }

        // 상태가 그 사이 바뀌지 않았을 때만 갱신해 동시에 두 번 눌러도 이력이 중복되지 않게 함
        const changed = await tx.repairRequest.updateMany({
          where: { companyId, id, status: current.status },
          data: {
            status: input.toStatus,
            statusChangedOn: toDate(effectiveOn),
            resolvedOn: input.toStatus === 'DONE' ? toDate(effectiveOn) : null,
            updatedAt: now(),
          },
        });

        if (changed.count !== 1) {
          throw invalid(
            'body.toStatus',
            '다른 곳에서 상태가 먼저 바뀌었습니다. 새로 고친 뒤 다시 시도해 주세요',
          );
        }

        await tx.repairRequestStatusChange.create({
          data: {
            companyId,
            repairRequestId: id,
            fromStatus: current.status,
            toStatus: input.toStatus,
            effectiveOn: toDate(effectiveOn),
            note,
            changedBy: userId,
          },
        });

        return detailOf(tx, id);
      }),

    link: (companyId, userId, id, input) =>
      withCompany(app, companyId, async (tx) => {
        const current = await findWithProject(tx, id);

        assertProjectAllows(current.project.status);

        if (input.workLogId) {
          // 같은 프로젝트에서 사후 작업으로 표시한 저장된 작업 내역만 연결할 수 있음 (다른 회사·프로젝트 작업 내역은 없는 것으로 취급)
          const log = await tx.workLog.findFirst({
            where: {
              id: input.workLogId,
              projectId: current.projectId,
              isAfterService: true,
              status: 'SAVED',
            },
            select: { id: true },
          });

          if (!log) {
            throw invalid(
              'body.workLogId',
              '사후 작업으로 표시한 저장된 작업 내역만 연결할 수 있습니다',
            );
          }

          if (
            await tx.repairRequestLink.findFirst({
              where: { repairRequestId: id, workLogId: input.workLogId, unlinkedAt: null },
              select: { id: true },
            })
          ) {
            throw invalid('body.workLogId', '이미 연결된 작업 내역입니다');
          }
        } else {
          const record = await tx.materialRecord.findFirst({
            where: {
              id: input.materialRecordId,
              projectId: current.projectId,
              isAfterService: true,
              deletedAt: null,
            },
            select: { id: true },
          });

          if (!record) {
            throw invalid(
              'body.materialRecordId',
              '사후 작업으로 표시한 자재 기록만 연결할 수 있습니다',
            );
          }

          if (
            await tx.repairRequestLink.findFirst({
              where: {
                repairRequestId: id,
                materialRecordId: input.materialRecordId,
                unlinkedAt: null,
              },
              select: { id: true },
            })
          ) {
            throw invalid('body.materialRecordId', '이미 연결된 자재 기록입니다');
          }
        }

        await tx.repairRequestLink.create({
          data: {
            companyId,
            repairRequestId: id,
            workLogId: input.workLogId ?? null,
            materialRecordId: input.materialRecordId ?? null,
            linkedBy: userId,
          },
        });

        return detailOf(tx, id);
      }),

    unlink: (companyId, id, linkId) =>
      withCompany(app, companyId, async (tx) => {
        const current = await findWithProject(tx, id);

        assertProjectAllows(current.project.status);

        const unlinked = await tx.repairRequestLink.updateMany({
          where: { companyId, id: linkId, repairRequestId: id, unlinkedAt: null },
          data: { unlinkedAt: now() },
        });

        if (unlinked.count === 0) {
          throw new RepairError('NOT_FOUND');
        }

        return detailOf(tx, id);
      }),

    afterServiceUsage: (companyId, projectId) =>
      withCompany(app, companyId, async (tx) => {
        if (!(await tx.project.findFirst({ where: { id: projectId }, select: { id: true } }))) {
          throw new RepairError('NOT_FOUND');
        }

        const [logs, minutes, grouped] = await Promise.all([
          tx.workLog.count({ where: { projectId, status: 'SAVED', isAfterService: true } }),
          tx.workLogEntry.aggregate({
            where: { workLog: { projectId, status: 'SAVED', isAfterService: true } },
            _sum: { minutes: true },
          }),
          tx.materialRecord.groupBy({
            by: ['materialId'],
            where: { projectId, isAfterService: true, kind: 'USED', deletedAt: null },
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
