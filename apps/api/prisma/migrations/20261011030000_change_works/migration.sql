-- CreateEnum
CREATE TYPE "change_work_status" AS ENUM ('NEGOTIATING', 'AGREED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "change_works" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "requested_on" DATE NOT NULL,
    "requester" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "change_work_status" NOT NULL DEFAULT 'NEGOTIATING',
    "status_changed_on" DATE NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_works_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "change_work_status_changes" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "change_work_id" UUID NOT NULL,
    "from_status" "change_work_status" NOT NULL,
    "to_status" "change_work_status" NOT NULL,
    "effective_on" DATE NOT NULL,
    "note" TEXT,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_work_status_changes_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "change_work_documents" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "change_work_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "linked_by" UUID NOT NULL,
    "linked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinked_at" TIMESTAMPTZ(3),

    CONSTRAINT "change_work_documents_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "change_works_company_id_project_id_status_idx" ON "change_works"("company_id", "project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "change_works_company_id_project_id_seq_key" ON "change_works"("company_id", "project_id", "seq");

-- CreateIndex
CREATE INDEX "change_work_status_changes_company_id_change_work_id_change_idx" ON "change_work_status_changes"("company_id", "change_work_id", "changed_at");

-- CreateIndex
CREATE INDEX "change_work_documents_company_id_change_work_id_idx" ON "change_work_documents"("company_id", "change_work_id");

-- CreateIndex
CREATE INDEX "change_work_documents_company_id_document_id_idx" ON "change_work_documents"("company_id", "document_id");

-- AddForeignKey
ALTER TABLE "change_works" ADD CONSTRAINT "change_works_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "change_works" ADD CONSTRAINT "change_works_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- 작성자는 같은 회사의 계정만 가리킬 수 있음 (복합 키)
ALTER TABLE "change_works" ADD CONSTRAINT "change_works_company_id_created_by_fkey" FOREIGN KEY ("company_id", "created_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "change_work_status_changes" ADD CONSTRAINT "change_work_status_changes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "change_work_status_changes" ADD CONSTRAINT "change_work_status_changes_company_id_change_work_id_fkey" FOREIGN KEY ("company_id", "change_work_id") REFERENCES "change_works"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "change_work_status_changes" ADD CONSTRAINT "change_work_status_changes_company_id_changed_by_fkey" FOREIGN KEY ("company_id", "changed_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "change_work_documents" ADD CONSTRAINT "change_work_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "change_work_documents" ADD CONSTRAINT "change_work_documents_company_id_change_work_id_fkey" FOREIGN KEY ("company_id", "change_work_id") REFERENCES "change_works"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- 증빙 문서는 같은 회사의 문서만 가리킬 수 있음 (복합 키)
ALTER TABLE "change_work_documents" ADD CONSTRAINT "change_work_documents_company_id_document_id_fkey" FOREIGN KEY ("company_id", "document_id") REFERENCES "documents"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "change_work_documents" ADD CONSTRAINT "change_work_documents_company_id_linked_by_fkey" FOREIGN KEY ("company_id", "linked_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 번호는 1 이상, 요청자 1~100자, 내용 1~2000자, 철회·변경 메모 500자까지, 상태 이력은 다른 상태로의 변경만
ALTER TABLE "change_works" ADD CONSTRAINT change_works_seq_positive CHECK ("seq" >= 1);
ALTER TABLE "change_works" ADD CONSTRAINT change_works_requester_length CHECK (char_length("requester") BETWEEN 1 AND 100);
ALTER TABLE "change_works" ADD CONSTRAINT change_works_content_length CHECK (char_length("content") BETWEEN 1 AND 2000);
ALTER TABLE "change_work_status_changes" ADD CONSTRAINT change_work_status_changes_differs CHECK ("from_status" <> "to_status");
ALTER TABLE "change_work_status_changes" ADD CONSTRAINT change_work_status_changes_note_length CHECK ("note" IS NULL OR char_length("note") BETWEEN 1 AND 500);
ALTER TABLE "change_work_status_changes" ADD CONSTRAINT change_work_status_changes_withdraw_note CHECK ("to_status" <> 'WITHDRAWN' OR "note" IS NOT NULL);

-- 같은 문서를 같은 변경 작업에 중복 연결할 수 없음 (연결을 푼 행은 제외)
CREATE UNIQUE INDEX change_work_documents_active_unique ON "change_work_documents"("company_id", "change_work_id", "document_id") WHERE "unlinked_at" IS NULL;

-- 앱 계정은 자기 회사 행만. 변경 작업은 내용·상태 열만 고칠 수 있고 지울 수 없음, 상태 이력은 추가만, 증빙 연결은 해제 시각만 고침
ALTER TABLE "change_works" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "change_works" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "change_works" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "change_works" TO field_note_app;
GRANT UPDATE ("requested_on", "requester", "content", "status", "status_changed_on", "updated_at") ON "change_works" TO field_note_app;

ALTER TABLE "change_work_status_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "change_work_status_changes" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "change_work_status_changes" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "change_work_status_changes" TO field_note_app;

ALTER TABLE "change_work_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "change_work_documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "change_work_documents" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "change_work_documents" TO field_note_app;
GRANT UPDATE ("unlinked_at") ON "change_work_documents" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "change_works" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "change_works"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "change_works" TO field_note_purge;
CREATE POLICY purge_only ON "change_work_status_changes" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "change_work_status_changes"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "change_work_status_changes" TO field_note_purge;
CREATE POLICY purge_only ON "change_work_documents" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "change_work_documents"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "change_work_documents" TO field_note_purge;
