import { isStagedExpired } from '@field-note/shared';

import type { Prisma } from '../db/client';

// 임시 보관 시간이 지나 삭제된 파일을 폼에 연결하려 할 때 (오류 처리기가 STAGED_FILE_EXPIRED 응답으로 변환)
export class StagedFileExpiredError extends Error {
  constructor(readonly fileId: string) {
    super(`[file.staged] EXPIRED ${fileId}`);
  }
}

/**
 * @description 파일 행을 잠금 (연결과 검사 완료·삭제가 동시에 일어나도 상태가 어긋나지 않게 순서를 맞춤)
 * @param tx 회사 범위 트랜잭션
 * @param fileId 파일 ID
 */
export const lockFile = async (tx: Prisma.TransactionClient, fileId: string) => {
  await tx.$executeRaw`SELECT 1 FROM files WHERE id = ${fileId}::uuid FOR UPDATE`;
};

/**
 * @description 폼 저장으로 파일을 연결하기 직전의 확정: 임시 보관 중인 파일은 사용 가능으로 바꾸고,
 * 보관 시간이 지났거나 정리 작업이 이미 지운 파일은 만료 오류로 막음 (검사 중인 파일은 검사가 끝날 때 연결 여부로 확정)
 * @param tx 회사 범위 트랜잭션
 * @param companyId 회사 ID
 * @param fileId 파일 ID
 * @param at 현재 시각
 * @returns 잠금 뒤의 최신 파일 행 (없으면 null), 거부 여부는 이 행으로 판단
 */
export const confirmStagedFile = async (
  tx: Prisma.TransactionClient,
  companyId: string,
  fileId: string,
  at: Date,
): Promise<Prisma.StoredFileGetPayload<object> | null> => {
  await lockFile(tx, fileId);

  const file = await tx.storedFile.findFirst({ where: { id: fileId } });

  if (!file) {
    return null;
  }

  if (file.status === 'REJECTED' && file.rejectReason === 'EXPIRED') {
    throw new StagedFileExpiredError(fileId);
  }

  if (file.status !== 'STAGED') {
    return file;
  }

  if (isStagedExpired(file.createdAt, at)) {
    throw new StagedFileExpiredError(fileId);
  }

  return tx.storedFile.update({
    where: { companyId_id: { companyId, id: fileId } },
    data: { status: 'READY' },
  });
};
