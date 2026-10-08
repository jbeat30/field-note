-- CreateEnum
CREATE TYPE "photo_category" AS ENUM ('BEFORE', 'DURING', 'AFTER', 'DEFECT', 'MATERIAL', 'SAFETY', 'OTHER');

-- CreateTable
CREATE TABLE "photos" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "category" "photo_category" NOT NULL DEFAULT 'OTHER',
    "area" TEXT,
    "taken_at" TIMESTAMPTZ(3) NOT NULL,
    "work_date" DATE NOT NULL,
    "description" TEXT,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "photos_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "photos_company_id_file_id_key" ON "photos"("company_id", "file_id");

-- CreateIndex
CREATE INDEX "photos_company_id_project_id_taken_at_id_idx" ON "photos"("company_id", "project_id", "taken_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "photos_company_id_project_id_work_date_idx" ON "photos"("company_id", "project_id", "work_date");

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 사진은 같은 회사의 프로젝트·파일·계정만 가리킬 수 있음 (복합 키)
ALTER TABLE "photos" ADD CONSTRAINT "photos_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_company_id_file_id_fkey" FOREIGN KEY ("company_id", "file_id") REFERENCES "files"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_company_id_uploaded_by_fkey" FOREIGN KEY ("company_id", "uploaded_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- API 검증과 같은 범위를 DB도 보장
ALTER TABLE "photos" ADD CONSTRAINT photos_area_length CHECK ("area" IS NULL OR char_length("area") BETWEEN 1 AND 100);
ALTER TABLE "photos" ADD CONSTRAINT photos_description_length CHECK ("description" IS NULL OR char_length("description") BETWEEN 1 AND 500);

-- 앱 계정은 자기 회사 행만 조회·생성·수정 (사진은 지우지 않고 deleted_at으로 소프트 삭제)
ALTER TABLE "photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "photos" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "photos" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "photos" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "photos" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "photos"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "photos" TO field_note_purge;
