-- CreateEnum
CREATE TYPE "partner_kind" AS ENUM ('CLIENT', 'SUBCONTRACTOR', 'SUPPLIER');

-- CreateTable
CREATE TABLE "partners" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "kind" "partner_kind" NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "memo" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "partners_company_id_kind_idx" ON "partners"("company_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "partners_company_id_kind_name_key_key" ON "partners"("company_id", "kind", "name_key");

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- API 검증과 같은 범위를 DB도 보장
ALTER TABLE "partners" ADD CONSTRAINT partners_name_length CHECK (char_length("name") BETWEEN 1 AND 50);
ALTER TABLE "partners" ADD CONSTRAINT partners_name_key_not_empty CHECK (char_length("name_key") >= 1);
ALTER TABLE "partners" ADD CONSTRAINT partners_contact_name_length CHECK ("contact_name" IS NULL OR char_length("contact_name") BETWEEN 1 AND 30);
ALTER TABLE "partners" ADD CONSTRAINT partners_phone_length CHECK ("phone" IS NULL OR char_length("phone") BETWEEN 1 AND 30);
ALTER TABLE "partners" ADD CONSTRAINT partners_memo_length CHECK ("memo" IS NULL OR char_length("memo") <= 1000);

-- 앱 계정은 자기 회사 행만 조회·생성·수정 (삭제 권한 없음: 쓰지 않는 업체는 숨김 처리)
ALTER TABLE "partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partners" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "partners" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "partners" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "partners" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "partners"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "partners" TO field_note_purge;
