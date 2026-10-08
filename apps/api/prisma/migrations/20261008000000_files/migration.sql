-- CreateEnum
CREATE TYPE "file_purpose" AS ENUM ('PHOTO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "file_status" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'REJECTED');

-- CreateEnum
CREATE TYPE "file_reject_reason" AS ENUM ('CONTENT_MISMATCH', 'SIZE_MISMATCH', 'NOT_UPLOADED', 'UNREADABLE_IMAGE');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN "storage_quota_bytes" BIGINT NOT NULL DEFAULT 5368709120;

-- CreateTable
CREATE TABLE "files" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "purpose" "file_purpose" NOT NULL,
    "status" "file_status" NOT NULL DEFAULT 'PENDING',
    "original_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "object_key" TEXT NOT NULL,
    "thumbnail_key" TEXT,
    "sha256" TEXT,
    "reject_reason" "file_reject_reason",
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ready_at" TIMESTAMPTZ(3),

    CONSTRAINT "files_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "files_object_key_key" ON "files"("object_key");

-- CreateIndex
CREATE INDEX "files_company_id_project_id_purpose_idx" ON "files"("company_id", "project_id", "purpose");

-- CreateIndex
CREATE INDEX "files_company_id_status_idx" ON "files"("company_id", "status");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 파일은 같은 회사의 프로젝트·계정만 가리킬 수 있음 (복합 키)
ALTER TABLE "files" ADD CONSTRAINT "files_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_company_id_uploaded_by_fkey" FOREIGN KEY ("company_id", "uploaded_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- API 검증과 같은 범위를 DB도 보장
ALTER TABLE "companies" ADD CONSTRAINT companies_storage_quota_not_negative CHECK ("storage_quota_bytes" >= 0);
ALTER TABLE "files" ADD CONSTRAINT files_original_name_length CHECK (char_length("original_name") BETWEEN 1 AND 200);
ALTER TABLE "files" ADD CONSTRAINT files_size_positive CHECK ("size_bytes" > 0);
-- 사용 가능한 파일은 원본 고유값과 완료 시각이 있어야 하고, 거부된 파일은 사유가 있어야 함
ALTER TABLE "files" ADD CONSTRAINT files_status_consistency CHECK (
  ("status" <> 'READY' OR ("sha256" IS NOT NULL AND "ready_at" IS NOT NULL))
  AND (("status" = 'REJECTED') = ("reject_reason" IS NOT NULL))
);

-- 앱 계정은 자기 회사 행만 조회·생성·수정 (파일 메타데이터는 지우지 않음: 소프트 삭제는 사진·자료 기능에서 추가)
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "files" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "files" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "files" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "files" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "files"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "files" TO field_note_purge;
