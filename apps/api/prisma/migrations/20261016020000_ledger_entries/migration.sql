-- 지출·수입 기록(08 문서 §6): 프로젝트에서 나간 돈과 가끔 생기는 수입만 기록, 계약 금액·청구·입금 관리는 제외
CREATE TYPE "ledger_kind" AS ENUM ('EXPENSE', 'INCOME');

CREATE TABLE "ledger_entries" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "entry_date" DATE NOT NULL,
    "kind" "ledger_kind" NOT NULL,
    "category_id" UUID,
    "amount" BIGINT NOT NULL,
    "partner_id" UUID,
    "content" TEXT,
    "document_id" UUID,
    "change_work_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("company_id","id"),
    CONSTRAINT "ledger_entries_amount_range" CHECK ("amount" BETWEEN 1 AND 10000000000),
    CONSTRAINT "ledger_entries_content_length" CHECK ("content" IS NULL OR char_length("content") BETWEEN 1 AND 200)
);

CREATE INDEX "ledger_entries_company_id_project_id_entry_date_id_idx" ON "ledger_entries"("company_id", "project_id", "entry_date" DESC, "id" DESC);
CREATE INDEX "ledger_entries_company_id_document_id_idx" ON "ledger_entries"("company_id", "document_id");
CREATE INDEX "ledger_entries_company_id_change_work_id_idx" ON "ledger_entries"("company_id", "change_work_id");

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_company_id_category_id_fkey" FOREIGN KEY ("company_id", "category_id") REFERENCES "option_items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_company_id_partner_id_fkey" FOREIGN KEY ("company_id", "partner_id") REFERENCES "partners"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_company_id_document_id_fkey" FOREIGN KEY ("company_id", "document_id") REFERENCES "documents"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_company_id_change_work_id_fkey" FOREIGN KEY ("company_id", "change_work_id") REFERENCES "change_works"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_company_id_created_by_fkey" FOREIGN KEY ("company_id", "created_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 앱 계정은 자기 회사 행만 조회·생성·수정 (기록은 deleted_at으로 소프트 삭제: 삭제 권한 없음)
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_entries" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "ledger_entries" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "ledger_entries" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "ledger_entries" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "ledger_entries"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "ledger_entries" TO field_note_purge;
