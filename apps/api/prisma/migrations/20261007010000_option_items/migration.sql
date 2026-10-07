-- CreateEnum
CREATE TYPE "option_kind" AS ENUM ('JOB_TYPE', 'WORK_CATEGORY', 'TRADE', 'WORKER_TYPE');

-- CreateTable
CREATE TABLE "option_items" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "kind" "option_kind" NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "option_items_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "option_items_company_id_kind_sort_order_idx" ON "option_items"("company_id", "kind", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "option_items_company_id_kind_name_key_key" ON "option_items"("company_id", "kind", "name_key");

-- AddForeignKey
ALTER TABLE "option_items" ADD CONSTRAINT "option_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- API 검증과 같은 범위를 DB도 보장 (우회 경로가 있어도 잘못된 값이 저장되지 않게 함)
ALTER TABLE "option_items" ADD CONSTRAINT option_items_name_length CHECK (char_length("name") BETWEEN 1 AND 30);
ALTER TABLE "option_items" ADD CONSTRAINT option_items_name_key_not_empty CHECK (char_length("name_key") >= 1);
ALTER TABLE "option_items" ADD CONSTRAINT option_items_sort_order_range CHECK ("sort_order" >= 0);

-- 앱 계정은 자기 회사 행만 조회·생성·수정 (삭제 권한 없음: 쓰지 않는 항목은 숨김 처리)
ALTER TABLE "option_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "option_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "option_items" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "option_items" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "option_items" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "option_items"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "option_items" TO field_note_purge;
