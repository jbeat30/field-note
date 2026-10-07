-- CreateEnum
CREATE TYPE "employee_status" AS ENUM ('ACTIVE', 'ON_LEAVE', 'LEFT');

-- CreateTable
CREATE TABLE "employees" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "title" TEXT,
    "job_type_id" UUID,
    "worker_type_id" UUID,
    "status" "employee_status" NOT NULL DEFAULT 'ACTIVE',
    "hired_on" DATE,
    "left_on" DATE,
    "birth_date" DATE,
    "phone" TEXT,
    "memo" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "employees_company_id_status_idx" ON "employees"("company_id", "status");

-- CreateIndex
CREATE INDEX "employees_company_id_name_idx" ON "employees"("company_id", "name");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 직종·구분은 같은 회사의 항목만 가리킬 수 있음 (복합 키, 값이 비어 있으면 검사하지 않음)
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_job_type_id_fkey" FOREIGN KEY ("company_id", "job_type_id") REFERENCES "option_items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_worker_type_id_fkey" FOREIGN KEY ("company_id", "worker_type_id") REFERENCES "option_items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- API 검증과 같은 범위를 DB도 보장
ALTER TABLE "employees" ADD CONSTRAINT employees_name_length CHECK (char_length("name") BETWEEN 1 AND 50);
ALTER TABLE "employees" ADD CONSTRAINT employees_title_length CHECK ("title" IS NULL OR char_length("title") BETWEEN 1 AND 30);
ALTER TABLE "employees" ADD CONSTRAINT employees_phone_length CHECK ("phone" IS NULL OR char_length("phone") BETWEEN 1 AND 30);
ALTER TABLE "employees" ADD CONSTRAINT employees_memo_length CHECK ("memo" IS NULL OR char_length("memo") <= 1000);
ALTER TABLE "employees" ADD CONSTRAINT employees_dates_order CHECK ("hired_on" IS NULL OR "left_on" IS NULL OR "left_on" >= "hired_on");
-- 퇴사 상태에는 퇴사일이 있어야 하고, 재직·휴직 상태에는 퇴사일이 없어야 함
ALTER TABLE "employees" ADD CONSTRAINT employees_left_consistency CHECK (("status" = 'LEFT') = ("left_on" IS NOT NULL));

-- 앱 계정은 자기 회사 행만 조회·생성·수정 (삭제 권한 없음: 퇴사는 상태 변경, 개인정보 정정·삭제 요청은 익명화로 처리)
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "employees" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "employees" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "employees" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "employees"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "employees" TO field_note_purge;
