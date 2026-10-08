-- CreateEnum
CREATE TYPE "document_category" AS ENUM ('DRAWING', 'SPEC', 'WORK_ORDER', 'CONTRACT', 'SAFETY', 'OTHER');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('DOCUMENT_VIEWED', 'DOCUMENT_DOWNLOADED');

-- CreateTable
CREATE TABLE "documents" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "category" "document_category" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "document_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "file_id" UUID NOT NULL,
    "revision_date" DATE NOT NULL,
    "reason" TEXT,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "action" "audit_action" NOT NULL,
    "actor_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "detail" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "documents_company_id_project_id_category_idx" ON "documents"("company_id", "project_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_company_id_document_id_version_no_key" ON "document_versions"("company_id", "document_id", "version_no");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_company_id_file_id_key" ON "document_versions"("company_id", "file_id");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_action_target_id_created_at_idx" ON "audit_logs"("company_id", "action", "target_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 문서·버전·감사 기록은 같은 회사의 프로젝트·파일·계정만 가리킬 수 있음 (복합 키)
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_created_by_fkey" FOREIGN KEY ("company_id", "created_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_company_id_document_id_fkey" FOREIGN KEY ("company_id", "document_id") REFERENCES "documents"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_company_id_file_id_fkey" FOREIGN KEY ("company_id", "file_id") REFERENCES "files"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_company_id_uploaded_by_fkey" FOREIGN KEY ("company_id", "uploaded_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_actor_id_fkey" FOREIGN KEY ("company_id", "actor_id") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- API 검증과 같은 범위를 DB도 보장
ALTER TABLE "documents" ADD CONSTRAINT documents_title_length CHECK (char_length("title") BETWEEN 1 AND 100);
ALTER TABLE "document_versions" ADD CONSTRAINT document_versions_version_positive CHECK ("version_no" >= 1);
ALTER TABLE "document_versions" ADD CONSTRAINT document_versions_reason_length CHECK ("reason" IS NULL OR char_length("reason") BETWEEN 1 AND 200);

-- 앱 계정은 자기 회사 행만 다룸
-- - 문서: 조회·생성·수정 (삭제는 deleted_at 소프트 삭제)
-- - 버전: 조회·생성만 (이전 버전은 바꾸거나 지울 수 없음)
-- - 감사 기록: 조회·생성만 (수정·삭제 불가, 서비스 기획서 §13.1)
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "documents" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "documents" TO field_note_app;

ALTER TABLE "document_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_versions" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "document_versions" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "document_versions" TO field_note_app;

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "audit_logs" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "audit_logs" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['documents', 'document_versions', 'audit_logs']
  LOOP
    EXECUTE format(
      'CREATE POLICY purge_only ON %I TO field_note_purge USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = %I."company_id" AND c."status" = ''CLOSING''))',
      t, t);
    EXECUTE format('GRANT SELECT, DELETE ON %I TO field_note_purge', t);
  END LOOP;
END
$$;
