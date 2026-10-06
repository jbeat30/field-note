import { DEFAULT_COMPANY_SETTINGS, type CompanySettings } from '@field-note/shared';

import type { PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

export type CompanySettingsService = {
  // 저장된 설정, 아직 없으면 기본값
  get: (companyId: string) => Promise<CompanySettings>;
  // 설정 저장 (없으면 만들고 있으면 갱신), 저장된 값을 돌려줌
  save: (companyId: string, settings: CompanySettings) => Promise<CompanySettings>;
};

const toSettings = (row: {
  standardWorkMinutes: number;
  monthlyWorkDays: number;
  workUnitMode: CompanySettings['workUnitMode'];
}): CompanySettings => ({
  standardWorkMinutes: row.standardWorkMinutes,
  monthlyWorkDays: row.monthlyWorkDays,
  workUnitMode: row.workUnitMode,
});

/**
 * @description 회사 설정 서비스 (앱 계정으로 자기 회사 범위에서만 조회·수정)
 * @param app 앱 계정(DATABASE_URL, RLS 적용) Prisma 클라이언트
 * @returns 회사 설정 서비스
 */
export const createCompanySettingsService = (app: PrismaClient): CompanySettingsService => ({
  get: (companyId) =>
    withCompany(app, companyId, async (tx) => {
      const row = await tx.companySettings.findFirst();

      return row ? toSettings(row) : DEFAULT_COMPANY_SETTINGS;
    }),

  save: (companyId, settings) =>
    withCompany(app, companyId, async (tx) =>
      toSettings(
        await tx.companySettings.upsert({
          where: { companyId },
          update: settings,
          create: { companyId, ...settings },
        }),
      ),
    ),
});
