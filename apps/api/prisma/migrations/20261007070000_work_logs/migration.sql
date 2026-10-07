-- CreateEnum
CREATE TYPE "work_log_status" AS ENUM ('DRAFT', 'SAVED');

-- CreateTable
CREATE TABLE "work_logs" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "status" "work_log_status" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL DEFAULT '',
    "area" TEXT,
    "notes" TEXT,
    "is_change" BOOLEAN NOT NULL DEFAULT false,
    "is_after_service" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "saved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_logs_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "work_log_entries" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "work_log_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "minutes" INTEGER NOT NULL,

    CONSTRAINT "work_log_entries_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "work_log_revisions" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "work_log_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_log_revisions_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "work_logs_company_id_work_date_idx" ON "work_logs"("company_id", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "work_logs_company_id_project_id_work_date_key" ON "work_logs"("company_id", "project_id", "work_date");

-- CreateIndex
CREATE INDEX "work_log_entries_company_id_employee_id_idx" ON "work_log_entries"("company_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_log_entries_company_id_work_log_id_employee_id_categor_key" ON "work_log_entries"("company_id", "work_log_id", "employee_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_log_revisions_company_id_work_log_id_version_key" ON "work_log_revisions"("company_id", "work_log_id", "version");

-- AddForeignKey
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 일지는 같은 회사의 프로젝트·직원·작업 구분만 가리킬 수 있음 (복합 키)
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_log_entries" ADD CONSTRAINT "work_log_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_log_entries" ADD CONSTRAINT "work_log_entries_company_id_work_log_id_fkey" FOREIGN KEY ("company_id", "work_log_id") REFERENCES "work_logs"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_log_entries" ADD CONSTRAINT "work_log_entries_company_id_employee_id_fkey" FOREIGN KEY ("company_id", "employee_id") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_log_entries" ADD CONSTRAINT "work_log_entries_company_id_category_id_fkey" FOREIGN KEY ("company_id", "category_id") REFERENCES "option_items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_log_revisions" ADD CONSTRAINT "work_log_revisions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_log_revisions" ADD CONSTRAINT "work_log_revisions_company_id_work_log_id_fkey" FOREIGN KEY ("company_id", "work_log_id") REFERENCES "work_logs"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_log_revisions" ADD CONSTRAINT "work_log_revisions_company_id_changed_by_fkey" FOREIGN KEY ("company_id", "changed_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- API 검증과 같은 범위를 DB도 보장
ALTER TABLE "work_logs" ADD CONSTRAINT work_logs_content_length CHECK (char_length("content") <= 5000);
ALTER TABLE "work_logs" ADD CONSTRAINT work_logs_area_length CHECK ("area" IS NULL OR char_length("area") BETWEEN 1 AND 100);
ALTER TABLE "work_logs" ADD CONSTRAINT work_logs_notes_length CHECK ("notes" IS NULL OR char_length("notes") <= 1000);
ALTER TABLE "work_logs" ADD CONSTRAINT work_logs_version_positive CHECK ("version" >= 1);
-- 저장됨은 작업 내용이 있어야 하고 처음 저장한 시각이 기록되어 있어야 함 (임시 저장은 비어 있어도 됨)
ALTER TABLE "work_logs" ADD CONSTRAINT work_logs_saved_consistency
  CHECK ("status" <> 'SAVED' OR (char_length(btrim("content")) >= 1 AND "saved_at" IS NOT NULL));
ALTER TABLE "work_log_entries" ADD CONSTRAINT work_log_entries_minutes_range CHECK ("minutes" BETWEEN 1 AND 1440);

-- 앱 계정은 자기 회사 행만 조회·생성·수정 (일지는 지우지 않음. 공수 항목은 수정할 때 바뀐 행을 지우지만 이전 값은 수정 이력에 남음, 수정 이력은 추가만)
ALTER TABLE "work_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "work_logs" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "work_logs" TO field_note_app;

ALTER TABLE "work_log_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_log_entries" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "work_log_entries" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "work_log_entries" TO field_note_app;

ALTER TABLE "work_log_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_log_revisions" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "work_log_revisions" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "work_log_revisions" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['work_logs', 'work_log_entries', 'work_log_revisions']
  LOOP
    EXECUTE format(
      'CREATE POLICY purge_only ON %I TO field_note_purge USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = %I."company_id" AND c."status" = ''CLOSING''))',
      t, t);
    EXECUTE format('GRANT SELECT, DELETE ON %I TO field_note_purge', t);
  END LOOP;
END
$$;
