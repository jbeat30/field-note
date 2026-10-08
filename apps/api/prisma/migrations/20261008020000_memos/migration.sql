-- CreateEnum
CREATE TYPE "memo_tag" AS ENUM ('NEGOTIATION', 'INSTRUCTION', 'ISSUE', 'TODO', 'OTHER');

-- CreateTable
CREATE TABLE "memos" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID,
    "content" TEXT NOT NULL,
    "tag" "memo_tag" NOT NULL DEFAULT 'OTHER',
    "memo_date" DATE NOT NULL,
    "done_at" TIMESTAMPTZ(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "memos_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "memos_company_id_project_id_memo_date_id_idx" ON "memos"("company_id", "project_id", "memo_date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "memos_company_id_tag_done_at_idx" ON "memos"("company_id", "tag", "done_at");

-- AddForeignKey
ALTER TABLE "memos" ADD CONSTRAINT "memos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 프로젝트가 비어 있으면(메모함) 검사하지 않고, 있으면 같은 회사의 프로젝트만 가리킬 수 있음 (복합 키)
ALTER TABLE "memos" ADD CONSTRAINT "memos_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memos" ADD CONSTRAINT "memos_company_id_created_by_fkey" FOREIGN KEY ("company_id", "created_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- API 검증과 같은 범위를 DB도 보장
ALTER TABLE "memos" ADD CONSTRAINT memos_content_length CHECK (char_length(btrim("content")) BETWEEN 1 AND 5000);
-- 완료 표시는 "할 일" 메모에만
ALTER TABLE "memos" ADD CONSTRAINT memos_done_only_todo CHECK ("done_at" IS NULL OR "tag" = 'TODO');

-- 앱 계정은 자기 회사 행만 조회·생성·수정 (메모는 지우지 않고 deleted_at으로 소프트 삭제)
ALTER TABLE "memos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memos" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "memos" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "memos" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "memos" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "memos"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "memos" TO field_note_purge;
