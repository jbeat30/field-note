-- CreateEnum
CREATE TYPE "monthly_close_kind" AS ENUM ('CLOSED', 'REOPENED');

-- CreateTable
CREATE TABLE "monthly_closes" (
    "company_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "is_closed" BOOLEAN NOT NULL,
    "standard_work_minutes" INTEGER NOT NULL,
    "monthly_work_days" INTEGER NOT NULL,
    "closed_at" TIMESTAMPTZ(3),
    "closed_by" UUID,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_closes_pkey" PRIMARY KEY ("company_id","month")
);

-- CreateTable
CREATE TABLE "monthly_close_events" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "month" DATE NOT NULL,
    "kind" "monthly_close_kind" NOT NULL,
    "reason" TEXT,
    "draft_log_count" INTEGER NOT NULL,
    "standard_work_minutes" INTEGER NOT NULL,
    "monthly_work_days" INTEGER NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_close_events_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "monthly_close_events_company_id_month_created_at_idx" ON "monthly_close_events"("company_id", "month", "created_at");

-- AddForeignKey
ALTER TABLE "monthly_closes" ADD CONSTRAINT "monthly_closes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_closes" ADD CONSTRAINT "monthly_closes_company_id_closed_by_fkey" FOREIGN KEY ("company_id", "closed_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_close_events" ADD CONSTRAINT "monthly_close_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_close_events" ADD CONSTRAINT "monthly_close_events_company_id_created_by_fkey" FOREIGN KEY ("company_id", "created_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 월은 그달 1일, 기준값 범위(하루 기준시간 60~960분, 월 기준일수 1~31), 확정된 달은 확정 시각이 있음
ALTER TABLE "monthly_closes" ADD CONSTRAINT monthly_closes_month_first_day CHECK ("month" = date_trunc('month', "month")::date);
ALTER TABLE "monthly_closes" ADD CONSTRAINT monthly_closes_settings_range CHECK ("standard_work_minutes" BETWEEN 60 AND 960 AND "monthly_work_days" BETWEEN 1 AND 31);
ALTER TABLE "monthly_closes" ADD CONSTRAINT monthly_closes_closed_consistency CHECK (NOT "is_closed" OR ("closed_at" IS NOT NULL AND "closed_by" IS NOT NULL));
ALTER TABLE "monthly_close_events" ADD CONSTRAINT monthly_close_events_month_first_day CHECK ("month" = date_trunc('month', "month")::date);
ALTER TABLE "monthly_close_events" ADD CONSTRAINT monthly_close_events_settings_range CHECK ("standard_work_minutes" BETWEEN 60 AND 960 AND "monthly_work_days" BETWEEN 1 AND 31);
ALTER TABLE "monthly_close_events" ADD CONSTRAINT monthly_close_events_draft_count CHECK ("draft_log_count" >= 0);
ALTER TABLE "monthly_close_events" ADD CONSTRAINT monthly_close_events_reason_length CHECK ("reason" IS NULL OR char_length("reason") BETWEEN 1 AND 500);
-- 재오픈은 사유 필수
ALTER TABLE "monthly_close_events" ADD CONSTRAINT monthly_close_events_reopen_reason CHECK ("kind" <> 'REOPENED' OR "reason" IS NOT NULL);

-- 앱 계정은 자기 회사 행만. 확정 상태는 값 열만 고칠 수 있고 지울 수 없음, 이력은 추가만
ALTER TABLE "monthly_closes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "monthly_closes" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "monthly_closes" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "monthly_closes" TO field_note_app;
GRANT UPDATE ("is_closed", "standard_work_minutes", "monthly_work_days", "closed_at", "closed_by", "updated_at") ON "monthly_closes" TO field_note_app;

ALTER TABLE "monthly_close_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "monthly_close_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "monthly_close_events" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "monthly_close_events" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "monthly_closes" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "monthly_closes"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "monthly_closes" TO field_note_purge;
CREATE POLICY purge_only ON "monthly_close_events" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "monthly_close_events"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "monthly_close_events" TO field_note_purge;
