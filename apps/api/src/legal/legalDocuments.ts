import { createHash } from 'node:crypto';

import {
  LEGAL_DOCUMENT_CONTENTS,
  legalDocumentText,
  type LegalDocumentContent,
} from '@field-note/shared';

import type { PrismaClient } from '../db/client';

/**
 * @description 문서 본문의 해시 (동의 시점에 어떤 내용이었는지 증명, 시드·운영 등록이 같은 값을 씀)
 * @param content 문서 내용
 * @returns SHA-256 16진수 문자열
 */
export const legalContentHash = (content: LegalDocumentContent) =>
  createHash('sha256').update(legalDocumentText(content)).digest('hex');

export class LegalContentChangedError extends Error {
  constructor(
    readonly type: string,
    readonly version: string,
  ) {
    super(`[legal.register] ${type} ${version}: 같은 버전인데 내용이 다름. version을 올려 주세요`);
  }
}

export type LegalRegisterResult = {
  type: string;
  version: string;
  status: 'CREATED' | 'UNCHANGED';
};

/**
 * @description 현재 문서 원본을 DB에 등록 (운영자 계정 전용, 이미 등록된 같은 버전은 건너뜀)
 * 같은 버전인데 본문 해시가 다르면 거부: 이미 동의받은 문서의 내용이 몰래 바뀌는 것을 막음
 * @param prisma 운영자 계정(DATABASE_OPERATOR_URL) Prisma 클라이언트
 * @returns 문서별 등록 결과
 * @throws 같은 버전의 내용이 달라진 경우
 */
export const registerLegalDocuments = async (
  prisma: PrismaClient,
): Promise<LegalRegisterResult[]> => {
  const results: LegalRegisterResult[] = [];

  for (const content of Object.values(LEGAL_DOCUMENT_CONTENTS)) {
    const contentHash = legalContentHash(content);
    const existing = await prisma.legalDocument.findUnique({
      where: { type_version: { type: content.type, version: content.version } },
    });

    if (existing) {
      if (existing.contentHash !== contentHash) {
        throw new LegalContentChangedError(content.type, content.version);
      }

      results.push({ type: content.type, version: content.version, status: 'UNCHANGED' });
      continue;
    }

    await prisma.legalDocument.create({
      data: {
        type: content.type,
        version: content.version,
        effectiveAt: new Date(content.effectiveAt),
        contentHash,
        isRequired: content.isRequired,
      },
    });
    results.push({ type: content.type, version: content.version, status: 'CREATED' });
  }

  return results;
};
