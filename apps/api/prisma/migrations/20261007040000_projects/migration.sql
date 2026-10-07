-- T0-4 격리 검증용 샘플 테이블 정리 (실제 프로젝트 테이블로 교체, 메모는 P2-3에서 정식으로 설계)
DROP TABLE "memos";
DROP TABLE "projects";

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('PLANNED', 'IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'WARRANTY', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "projects" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "project_status" NOT NULL DEFAULT 'PLANNED',
    "site_name" TEXT NOT NULL,
    "site_address" TEXT,
    "site_map_url" TEXT,
    "site_contact_name" TEXT,
    "site_contact_phone" TEXT,
    "access_memo" TEXT,
    "client_id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "contract_date" DATE NOT NULL,
    "planned_start" DATE NOT NULL,
    "planned_end" DATE NOT NULL,
    "memo" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "project_trades" (
    "company_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,

    CONSTRAINT "project_trades_pkey" PRIMARY KEY ("company_id","project_id","trade_id")
);

-- CreateTable
CREATE TABLE "project_code_sequences" (
    "company_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL,

    CONSTRAINT "project_code_sequences_pkey" PRIMARY KEY ("company_id","year")
);

-- CreateIndex
CREATE INDEX "projects_company_id_status_idx" ON "projects"("company_id", "status");

-- CreateIndex
CREATE INDEX "projects_company_id_planned_end_idx" ON "projects"("company_id", "planned_end");

-- CreateIndex
CREATE UNIQUE INDEX "projects_company_id_code_key" ON "projects"("company_id", "code");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 고객·담당자는 같은 회사의 명부·직원만 가리킬 수 있음 (복합 키)
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_client_id_fkey" FOREIGN KEY ("company_id", "client_id") REFERENCES "partners"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_manager_id_fkey" FOREIGN KEY ("company_id", "manager_id") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_trades" ADD CONSTRAINT "project_trades_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_trades" ADD CONSTRAINT "project_trades_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_trades" ADD CONSTRAINT "project_trades_company_id_trade_id_fkey" FOREIGN KEY ("company_id", "trade_id") REFERENCES "option_items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_code_sequences" ADD CONSTRAINT "project_code_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- API 검증과 같은 범위를 DB도 보장
ALTER TABLE "projects" ADD CONSTRAINT projects_code_format CHECK ("code" ~ '^[0-9]{4}-[0-9]{3,}$');
ALTER TABLE "projects" ADD CONSTRAINT projects_name_length CHECK (char_length("name") BETWEEN 1 AND 100);
ALTER TABLE "projects" ADD CONSTRAINT projects_site_name_length CHECK (char_length("site_name") BETWEEN 1 AND 100);
ALTER TABLE "projects" ADD CONSTRAINT projects_site_address_length CHECK ("site_address" IS NULL OR char_length("site_address") BETWEEN 1 AND 200);
ALTER TABLE "projects" ADD CONSTRAINT projects_site_map_url_format CHECK ("site_map_url" IS NULL OR ("site_map_url" ~ '^https?://' AND char_length("site_map_url") <= 500));
ALTER TABLE "projects" ADD CONSTRAINT projects_site_contact_name_length CHECK ("site_contact_name" IS NULL OR char_length("site_contact_name") BETWEEN 1 AND 30);
ALTER TABLE "projects" ADD CONSTRAINT projects_site_contact_phone_length CHECK ("site_contact_phone" IS NULL OR char_length("site_contact_phone") BETWEEN 1 AND 30);
ALTER TABLE "projects" ADD CONSTRAINT projects_access_memo_length CHECK ("access_memo" IS NULL OR char_length("access_memo") <= 1000);
ALTER TABLE "projects" ADD CONSTRAINT projects_memo_length CHECK ("memo" IS NULL OR char_length("memo") <= 1000);
-- 작업일지를 입력할 수 있는 기간이므로 시작이 종료보다 늦을 수 없음
ALTER TABLE "projects" ADD CONSTRAINT projects_period_order CHECK ("planned_start" <= "planned_end");
ALTER TABLE "project_code_sequences" ADD CONSTRAINT project_code_sequences_range CHECK ("year" BETWEEN 2000 AND 2999 AND "last_number" >= 1);

-- 앱 계정은 자기 회사 행만 조회·생성·수정 (프로젝트 삭제 권한 없음: 취소·종료는 상태로 표현, 공종 선택은 수정 때 다시 쓰기 위해 삭제 가능)
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "projects" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "projects" TO field_note_app;

ALTER TABLE "project_trades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_trades" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "project_trades" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, DELETE ON "project_trades" TO field_note_app;

-- 번호표는 번호를 올리는 것만 가능 (삭제하면 번호가 되돌아가 코드가 겹칠 수 있음)
ALTER TABLE "project_code_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_code_sequences" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "project_code_sequences" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "project_code_sequences" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects', 'project_trades', 'project_code_sequences']
  LOOP
    EXECUTE format(
      'CREATE POLICY purge_only ON %I TO field_note_purge USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = %I."company_id" AND c."status" = ''CLOSING''))',
      t, t);
    EXECUTE format('GRANT SELECT, DELETE ON %I TO field_note_purge', t);
  END LOOP;
END
$$;
