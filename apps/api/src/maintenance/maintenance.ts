import { FILE_STAGED_TTL_SECONDS, FILE_UPLOAD_URL_TTL_SECONDS } from '@field-note/shared';

import type { PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';
import { lockFile } from '../file/stagedFile';
import type { Logger } from '../logger';
import type { SessionStore } from '../session/sessionStore';
import type { ObjectStorage } from '../storage/objectStorage';

// 업로드 신청은 주소가 만료된 뒤 이만큼 더 기다렸다가 정리 (올리는 중인 파일을 건드리지 않게)
const STALE_UPLOAD_GRACE_SECONDS = 60 * 60;

export type MaintenanceResult = {
  expiredSessions: boolean;
  companies: number;
  staleUploads: number;
  expiredStaged: number;
  expiredIdempotencyKeys: number;
};

type Deps = {
  // 회사 목록은 회사 범위 밖 전용 계정(세션·인증)으로만 조회
  auth: PrismaClient;
  app: PrismaClient;
  sessionStore: SessionStore;
  storage: ObjectStorage;
  logger: Logger;
  now?: () => Date;
};

/**
 * @description 정기 유지 작업: 만료된 로그인 세션, 올리지 않고 방치된 파일 업로드 신청, 임시 보관 24시간이 지난 파일, 만료된 멱등 키 정리
 * 한 번 실행 중 일부가 실패해도 나머지는 계속 진행하고 오류는 로그 기록, 여러 번·동시 실행해도 결과 동일
 * @param deps 세션 저장소·DB·객체 저장소·로거
 * @returns 유지 작업 실행 함수
 */
export const createMaintenance = ({
  auth,
  app,
  sessionStore,
  storage,
  logger,
  now = () => new Date(),
}: Deps) => ({
  run: async (): Promise<MaintenanceResult> => {
    const result: MaintenanceResult = {
      expiredSessions: false,
      companies: 0,
      staleUploads: 0,
      expiredStaged: 0,
      expiredIdempotencyKeys: 0,
    };

    try {
      await sessionStore.deleteExpired();
      result.expiredSessions = true;
    } catch (error) {
      logger.error({ err: error }, '[maintenance.run] 만료 세션 정리 실패');
    }

    const companies = await auth.company.findMany({ select: { id: true } });

    for (const { id: companyId } of companies) {
      try {
        const at = now();
        const staleBefore = new Date(
          at.getTime() - (FILE_UPLOAD_URL_TTL_SECONDS + STALE_UPLOAD_GRACE_SECONDS) * 1000,
        );
        const cleaned = await withCompany(app, companyId, async (tx) => {
          // 올리지 않고 방치된 신청은 "올라오지 않음"으로 종료해 용량에서 제외, 남은 객체가 있으면 삭제
          const stale = await tx.storedFile.findMany({
            where: { status: 'PENDING', createdAt: { lt: staleBefore } },
            select: { id: true, objectKey: true },
          });

          if (stale.length > 0) {
            await tx.storedFile.updateMany({
              where: { id: { in: stale.map((file) => file.id) }, status: 'PENDING' },
              data: { status: 'REJECTED', rejectReason: 'NOT_UPLOADED' },
            });
          }

          // 폼에 연결되지 않은 채 보관 시간이 지난 임시 파일은 "만료"로 종료해 용량에서 제외, 저장소 객체도 삭제
          const expiredBefore = new Date(at.getTime() - FILE_STAGED_TTL_SECONDS * 1000);
          const candidates = await tx.storedFile.findMany({
            where: {
              status: 'STAGED',
              createdAt: { lt: expiredBefore },
              photo: null,
              documentVersion: null,
              credentials: { none: {} },
            },
            select: { id: true, objectKey: true, thumbnailKey: true },
          });

          // 같은 순간 폼 저장이 연결한 파일을 지우지 않도록 후보마다 잠그고 다시 확인
          const expired: typeof candidates = [];

          for (const candidate of candidates) {
            await lockFile(tx, candidate.id);

            const closed = await tx.storedFile.updateMany({
              where: {
                id: candidate.id,
                status: 'STAGED',
                photo: null,
                documentVersion: null,
                credentials: { none: {} },
              },
              data: { status: 'REJECTED', rejectReason: 'EXPIRED' },
            });

            if (closed.count > 0) expired.push(candidate);
          }

          const keys = await tx.idempotencyKey.deleteMany({ where: { expiresAt: { lte: at } } });

          return { stale, expired, keys: keys.count };
        });

        for (const file of cleaned.stale) {
          await storage.remove(file.objectKey).catch(() => undefined);
        }

        for (const file of cleaned.expired) {
          await storage.remove(file.objectKey).catch(() => undefined);

          if (file.thumbnailKey) {
            await storage.remove(file.thumbnailKey).catch(() => undefined);
          }
        }

        result.staleUploads += cleaned.stale.length;
        result.expiredStaged += cleaned.expired.length;
        result.expiredIdempotencyKeys += cleaned.keys;
        result.companies += 1;
      } catch (error) {
        logger.error({ err: error, companyId }, '[maintenance.run] 회사 정리 실패');
      }
    }

    return result;
  },
});

export type Maintenance = ReturnType<typeof createMaintenance>;

/**
 * @description 유지 작업의 주기 실행 (시작 직후 한 번, 이후 간격마다), 종료할 때 멈추는 함수 반환
 * @param maintenance 유지 작업
 * @param logger 로거
 * @param intervalMs 실행 간격 (기본 1시간)
 * @returns 멈추는 함수
 */
export const startMaintenanceSchedule = (
  maintenance: Maintenance,
  logger: Logger,
  intervalMs = 60 * 60 * 1000,
) => {
  let running = false;
  const tick = async () => {
    // 이전 실행이 끝나지 않았으면 건너뜀
    if (running) return;

    running = true;

    try {
      const result = await maintenance.run();

      logger.info(result, '[maintenance.run] 정기 유지 작업 완료');
    } catch (error) {
      logger.error({ err: error }, '[maintenance.run] 정기 유지 작업 실패');
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), intervalMs);

  timer.unref();
  void tick();

  return () => clearInterval(timer);
};
