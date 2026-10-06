import type { Prisma } from '../db/client';
import { findCurrentDocuments, validInvitationWhere } from '../invitation/invitationStore';

import { AccountError } from './accountError';

type Tx = Prisma.TransactionClient;

export type ConsentInput = { documentId: string; isAgreed: boolean };

/**
 * @description 초대 링크를 사용 처리하고 동의 내용을 검증 (아이디 가입·소셜 가입이 함께 쓰는 공통 단계)
 * 같은 트랜잭션 안에서 호출해야 이후 단계가 실패하면 링크도 소모되지 않는다
 * @param tx 트랜잭션
 * @param input 초대 토큰 원문과 동의 목록
 * @param at 현재 시각
 * @returns 초대가 가리키는 회사·계정
 * @throws 유효하지 않은 링크이거나 동의가 부족한 경우
 */
export const acceptInvitation = async (
  tx: Tx,
  input: { inviteToken: string; consents: ConsentInput[] },
  at: Date,
) => {
  const invitation = await tx.invitation.findFirst({
    where: validInvitationWhere(input.inviteToken, at),
  });

  if (!invitation) {
    throw new AccountError('INVITATION_INVALID');
  }

  // 동시에 같은 링크를 쓰는 요청이 있어도 조건부 갱신이라 한 쪽만 통과
  const { count } = await tx.invitation.updateMany({
    where: { tokenHash: invitation.tokenHash, usedAt: null },
    data: { usedAt: at },
  });

  if (count !== 1) {
    throw new AccountError('INVITATION_INVALID');
  }

  // 필수 문서에 모두 동의해야 하고, 현재 시행 중이 아닌 문서에 대한 동의는 받지 않음
  const documents = await findCurrentDocuments(tx, at);
  const documentIds = new Set(documents.map((document) => document.id));

  if (input.consents.some((consent) => !documentIds.has(consent.documentId))) {
    throw new AccountError('CONSENT_UNKNOWN_DOCUMENT');
  }

  const agreedIds = new Set(
    input.consents.filter((consent) => consent.isAgreed).map((consent) => consent.documentId),
  );

  if (documents.some((document) => document.isRequired && !agreedIds.has(document.id))) {
    throw new AccountError('CONSENT_REQUIRED');
  }

  return invitation;
};

/**
 * @description 가입 시점의 동의 결정을 이력으로 기록 (선택 약관 거부도 기록)
 * @param tx 트랜잭션
 * @param target 초대가 가리키는 회사·계정
 * @param consents 동의 목록
 * @param at 현재 시각
 */
export const recordConsents = (
  tx: Tx,
  target: { companyId: string; userId: string },
  consents: ConsentInput[],
  at: Date,
) =>
  tx.consent.createMany({
    data: consents.map((consent) => ({
      companyId: target.companyId,
      userId: target.userId,
      documentId: consent.documentId,
      isAgreed: consent.isAgreed,
      decidedAt: at,
    })),
  });
