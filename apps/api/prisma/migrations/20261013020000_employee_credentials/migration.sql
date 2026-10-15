-- AlterTable
ALTER TABLE "files" ADD COLUMN     "employee_id" UUID,
ALTER COLUMN "project_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "employee_credentials" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "employee_id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "issued_on" DATE,
    "expires_on" DATE,
    "file_id" UUID,
    "memo" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ(3),

    CONSTRAINT "employee_credentials_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "project_required_credentials" (
    "company_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_required_credentials_pkey" PRIMARY KEY ("company_id","project_id","type_id")
);

-- CreateIndex
CREATE INDEX "employee_credentials_company_id_employee_id_idx" ON "employee_credentials"("company_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_credentials_company_id_expires_on_idx" ON "employee_credentials"("company_id", "expires_on");

-- CreateIndex
CREATE INDEX "files_company_id_employee_id_idx" ON "files"("company_id", "employee_id");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_company_id_employee_id_fkey" FOREIGN KEY ("company_id", "employee_id") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_credentials" ADD CONSTRAINT "employee_credentials_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_credentials" ADD CONSTRAINT "employee_credentials_company_id_employee_id_fkey" FOREIGN KEY ("company_id", "employee_id") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_credentials" ADD CONSTRAINT "employee_credentials_company_id_type_id_fkey" FOREIGN KEY ("company_id", "type_id") REFERENCES "option_items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_credentials" ADD CONSTRAINT "employee_credentials_company_id_file_id_fkey" FOREIGN KEY ("company_id", "file_id") REFERENCES "files"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_credentials" ADD CONSTRAINT "employee_credentials_company_id_created_by_fkey" FOREIGN KEY ("company_id", "created_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_required_credentials" ADD CONSTRAINT "project_required_credentials_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_required_credentials" ADD CONSTRAINT "project_required_credentials_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_required_credentials" ADD CONSTRAINT "project_required_credentials_company_id_type_id_fkey" FOREIGN KEY ("company_id", "type_id") REFERENCES "option_items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;



-- 파일은 프로젝트 또는 직원 중 하나에만 붙고, 직원 서류 용도일 때만 직원에 붙음
ALTER TABLE "files" ADD CONSTRAINT files_owner_exclusive CHECK (("project_id" IS NOT NULL) <> ("employee_id" IS NOT NULL));
ALTER TABLE "files" ADD CONSTRAINT files_employee_purpose CHECK (("purpose" = 'EMPLOYEE_DOCUMENT') = ("employee_id" IS NOT NULL));

-- 취득일은 만료일을 넘을 수 없고, 메모는 500자까지
ALTER TABLE "employee_credentials" ADD CONSTRAINT employee_credentials_dates_order CHECK ("issued_on" IS NULL OR "expires_on" IS NULL OR "issued_on" <= "expires_on");
ALTER TABLE "employee_credentials" ADD CONSTRAINT employee_credentials_memo_length CHECK ("memo" IS NULL OR char_length("memo") BETWEEN 1 AND 500);

-- 앱 계정은 자기 회사 행만, 서류는 종류·날짜·파일·메모·삭제 시각만 고칠 수 있고 지울 수 없음 (필요 자격은 목록을 바꾸는 방식이라 삭제 가능)
ALTER TABLE "employee_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_credentials" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "employee_credentials" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "employee_credentials" TO field_note_app;
GRANT UPDATE ("type_id", "issued_on", "expires_on", "file_id", "memo", "removed_at", "updated_at") ON "employee_credentials" TO field_note_app;

ALTER TABLE "project_required_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_required_credentials" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "project_required_credentials" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, DELETE ON "project_required_credentials" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "employee_credentials" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "employee_credentials"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "employee_credentials" TO field_note_purge;
CREATE POLICY purge_only ON "project_required_credentials" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "project_required_credentials"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "project_required_credentials" TO field_note_purge;
