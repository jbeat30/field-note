import { DEFAULT_COMPANY_RULES, type CompanyRules } from '@field-note/shared';

import type { Prisma } from '../db/client';

/**
 * @description 회사의 경고 기준·보증 기본 기간 (저장한 적이 없으면 기본값), 회사 범위 트랜잭션 안에서 읽음
 * @param tx 회사 범위 트랜잭션
 * @returns 회사별 기준
 */
export const loadRules = async (tx: Prisma.TransactionClient): Promise<CompanyRules> => {
  const row = await tx.companySettings.findFirst({
    select: {
      burnWarnPercent: true,
      burnLimitPercent: true,
      aheadGapPercent: true,
      warrantyDefaultMonths: true,
    },
  });

  return row ?? DEFAULT_COMPANY_RULES;
};
