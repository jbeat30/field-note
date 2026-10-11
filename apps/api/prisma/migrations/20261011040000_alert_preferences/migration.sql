-- CreateEnum
CREATE TYPE "alert_kind" AS ENUM ('NO_LOG_TODAY', 'INBOX_STALE', 'BURN_REACHED', 'BURN_AHEAD', 'PROJECT_OVERDUE', 'DOUBLE_ASSIGNED', 'CHANGE_STALE');

-- CreateTable
CREATE TABLE "alert_preferences" (
    "company_id" UUID NOT NULL,
    "kind" "alert_kind" NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_preferences_pkey" PRIMARY KEY ("company_id","kind")
);

-- AddForeignKey
ALTER TABLE "alert_preferences" ADD CONSTRAINT "alert_preferences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 앱 계정은 자기 회사 행만 조회·추가하고 켜짐 여부만 바꿀 수 있음 (삭제 불가)
ALTER TABLE "alert_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alert_preferences" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "alert_preferences" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "alert_preferences" TO field_note_app;
GRANT UPDATE ("enabled", "updated_at") ON "alert_preferences" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "alert_preferences" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "alert_preferences"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "alert_preferences" TO field_note_purge;
