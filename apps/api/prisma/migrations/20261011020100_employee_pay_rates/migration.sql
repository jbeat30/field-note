-- CreateEnum
CREATE TYPE "pay_type" AS ENUM ('DAILY', 'HOURLY', 'MONTHLY', 'ANNUAL');

-- CreateTable
CREATE TABLE "employee_pay_rates" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "employee_id" UUID NOT NULL,
    "pay_type" "pay_type" NOT NULL,
    "amount" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_pay_rates_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "employee_pay_rates_company_id_employee_id_effective_from_cr_idx" ON "employee_pay_rates"("company_id", "employee_id", "effective_from", "created_at");

-- AddForeignKey
ALTER TABLE "employee_pay_rates" ADD CONSTRAINT "employee_pay_rates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_pay_rates" ADD CONSTRAINT "employee_pay_rates_company_id_employee_id_fkey" FOREIGN KEY ("company_id", "employee_id") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 입력자는 같은 회사의 계정만 가리킬 수 있음 (복합 키)
ALTER TABLE "employee_pay_rates" ADD CONSTRAINT "employee_pay_rates_company_id_created_by_fkey" FOREIGN KEY ("company_id", "created_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 금액은 0보다 크고 10억 원까지
ALTER TABLE "employee_pay_rates" ADD CONSTRAINT employee_pay_rates_amount_range
  CHECK ("amount" BETWEEN 1 AND 1000000000);

-- 앱 계정은 자기 회사 행만 조회·추가 (단가 기록은 수정·삭제할 수 없음)
ALTER TABLE "employee_pay_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_pay_rates" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "employee_pay_rates" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "employee_pay_rates" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "employee_pay_rates" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "employee_pay_rates"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "employee_pay_rates" TO field_note_purge;
