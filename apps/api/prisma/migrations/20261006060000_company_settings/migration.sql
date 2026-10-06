-- CreateEnum
CREATE TYPE "work_unit_mode" AS ENUM ('RATIO', 'HOURS');

-- CreateTable
CREATE TABLE "company_settings" (
    "company_id" UUID NOT NULL,
    "standard_work_minutes" INTEGER NOT NULL DEFAULT 480,
    "monthly_work_days" INTEGER NOT NULL DEFAULT 22,
    "work_unit_mode" "work_unit_mode" NOT NULL DEFAULT 'RATIO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("company_id")
);

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 범위 제약은 API 검증과 같은 값으로 DB에서도 보장 (우회 경로가 있어도 잘못된 값이 저장되지 않게 함)
ALTER TABLE "company_settings" ADD CONSTRAINT company_settings_standard_work_minutes_range CHECK ("standard_work_minutes" BETWEEN 60 AND 960);
ALTER TABLE "company_settings" ADD CONSTRAINT company_settings_monthly_work_days_range CHECK ("monthly_work_days" BETWEEN 1 AND 31);

-- 앱 계정은 자기 회사 행만 조회·생성·수정 (삭제 권한 없음)
ALTER TABLE "company_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_settings" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "company_settings" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "company_settings" TO field_note_app;
