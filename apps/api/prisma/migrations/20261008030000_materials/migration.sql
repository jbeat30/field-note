-- CreateEnum
CREATE TYPE "material_category" AS ENUM ('RAW', 'SUB', 'FINISH', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "material_record_kind" AS ENUM ('RECEIVED', 'USED', 'RETURNED', 'DISCARDED');

-- CreateTable
CREATE TABLE "materials" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "spec" TEXT,
    "spec_key" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL,
    "category" "material_category" NOT NULL DEFAULT 'CONSUMABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "material_records" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "record_date" DATE NOT NULL,
    "kind" "material_record_kind" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "category_id" UUID,
    "area" TEXT,
    "partner_id" UUID,
    "source_text" TEXT,
    "is_change" BOOLEAN NOT NULL DEFAULT false,
    "is_after_service" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "material_records_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "materials_company_id_name_key_spec_key_key" ON "materials"("company_id", "name_key", "spec_key");

-- CreateIndex
CREATE INDEX "material_records_company_id_project_id_record_date_id_idx" ON "material_records"("company_id", "project_id", "record_date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "material_records_company_id_material_id_idx" ON "material_records"("company_id", "material_id");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_records" ADD CONSTRAINT "material_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 기록은 같은 회사의 프로젝트·자재·작업 구분·업체·계정만 가리킬 수 있음 (복합 키). 작업 구분·업체는 비어 있으면 검사하지 않음
ALTER TABLE "material_records" ADD CONSTRAINT "material_records_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_records" ADD CONSTRAINT "material_records_company_id_material_id_fkey" FOREIGN KEY ("company_id", "material_id") REFERENCES "materials"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_records" ADD CONSTRAINT "material_records_company_id_category_id_fkey" FOREIGN KEY ("company_id", "category_id") REFERENCES "option_items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_records" ADD CONSTRAINT "material_records_company_id_partner_id_fkey" FOREIGN KEY ("company_id", "partner_id") REFERENCES "partners"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_records" ADD CONSTRAINT "material_records_company_id_created_by_fkey" FOREIGN KEY ("company_id", "created_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- API 검증과 같은 범위를 DB도 보장
ALTER TABLE "materials" ADD CONSTRAINT materials_name_length CHECK (char_length("name") BETWEEN 1 AND 50);
ALTER TABLE "materials" ADD CONSTRAINT materials_name_key_not_empty CHECK (char_length("name_key") >= 1);
ALTER TABLE "materials" ADD CONSTRAINT materials_spec_length CHECK ("spec" IS NULL OR char_length("spec") BETWEEN 1 AND 50);
ALTER TABLE "materials" ADD CONSTRAINT materials_unit_length CHECK (char_length("unit") BETWEEN 1 AND 10);
ALTER TABLE "material_records" ADD CONSTRAINT material_records_quantity_positive CHECK ("quantity" > 0);
ALTER TABLE "material_records" ADD CONSTRAINT material_records_area_length CHECK ("area" IS NULL OR char_length("area") BETWEEN 1 AND 100);
ALTER TABLE "material_records" ADD CONSTRAINT material_records_source_text_length CHECK ("source_text" IS NULL OR char_length("source_text") BETWEEN 1 AND 100);
ALTER TABLE "material_records" ADD CONSTRAINT material_records_memo_length CHECK ("memo" IS NULL OR char_length("memo") BETWEEN 1 AND 500);

-- 앱 계정은 자기 회사 행만 조회·생성·수정 (자재는 숨김, 기록은 deleted_at으로 소프트 삭제: 삭제 권한 없음)
ALTER TABLE "materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "materials" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "materials" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "materials" TO field_note_app;

ALTER TABLE "material_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "material_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "material_records" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "material_records" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['materials', 'material_records']
  LOOP
    EXECUTE format(
      'CREATE POLICY purge_only ON %I TO field_note_purge USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = %I."company_id" AND c."status" = ''CLOSING''))',
      t, t);
    EXECUTE format('GRANT SELECT, DELETE ON %I TO field_note_purge', t);
  END LOOP;
END
$$;
