-- CreateTable
CREATE TABLE "project_progress_records" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "percent" INTEGER NOT NULL,
    "recorded_on" DATE NOT NULL,
    "note" TEXT,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_progress_records_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "project_progress_records_company_id_project_id_recorded_on_created_at_idx" ON "project_progress_records"("company_id", "project_id", "recorded_on", "created_at");

-- AddForeignKey
ALTER TABLE "project_progress_records" ADD CONSTRAINT "project_progress_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_progress_records" ADD CONSTRAINT "project_progress_records_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 기록자는 같은 회사의 계정만 가리킬 수 있음 (복합 키)
ALTER TABLE "project_progress_records" ADD CONSTRAINT "project_progress_records_company_id_recorded_by_fkey" FOREIGN KEY ("company_id", "recorded_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 진행률은 0~100, 메모는 200자까지
ALTER TABLE "project_progress_records" ADD CONSTRAINT project_progress_records_percent_range
  CHECK ("percent" BETWEEN 0 AND 100);
ALTER TABLE "project_progress_records" ADD CONSTRAINT project_progress_records_note_length
  CHECK ("note" IS NULL OR char_length("note") BETWEEN 1 AND 200);

-- 앱 계정은 자기 회사 행만 조회·추가 (기록은 수정·삭제할 수 없음)
ALTER TABLE "project_progress_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_progress_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "project_progress_records" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "project_progress_records" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "project_progress_records" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "project_progress_records"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "project_progress_records" TO field_note_purge;
