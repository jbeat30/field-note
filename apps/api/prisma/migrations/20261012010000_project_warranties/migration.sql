-- CreateEnum
CREATE TYPE "warranty_start_basis" AS ENUM ('ACTUAL_END', 'INSPECTION', 'MANUAL');

-- CreateTable
CREATE TABLE "project_warranties" (
    "company_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "months" INTEGER NOT NULL,
    "start_basis" "warranty_start_basis" NOT NULL,
    "start_on" DATE NOT NULL,
    "end_on" DATE NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_warranties_pkey" PRIMARY KEY ("company_id","project_id")
);

-- CreateTable
CREATE TABLE "project_warranty_changes" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "from_months" INTEGER,
    "to_months" INTEGER NOT NULL,
    "from_end_on" DATE,
    "to_end_on" DATE NOT NULL,
    "start_basis" "warranty_start_basis" NOT NULL,
    "start_on" DATE NOT NULL,
    "reason" TEXT,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_warranty_changes_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "warranty_certificates" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "issuer" TEXT,
    "expires_on" DATE NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ(3),

    CONSTRAINT "warranty_certificates_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "project_warranties_company_id_end_on_idx" ON "project_warranties"("company_id", "end_on");

-- CreateIndex
CREATE INDEX "project_warranty_changes_company_id_project_id_changed_at_idx" ON "project_warranty_changes"("company_id", "project_id", "changed_at");

-- CreateIndex
CREATE INDEX "warranty_certificates_company_id_project_id_idx" ON "warranty_certificates"("company_id", "project_id");

-- CreateIndex
CREATE INDEX "warranty_certificates_company_id_expires_on_idx" ON "warranty_certificates"("company_id", "expires_on");

-- AddForeignKey
ALTER TABLE "project_warranties" ADD CONSTRAINT "project_warranties_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_warranties" ADD CONSTRAINT "project_warranties_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_warranties" ADD CONSTRAINT "project_warranties_company_id_updated_by_fkey" FOREIGN KEY ("company_id", "updated_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_warranty_changes" ADD CONSTRAINT "project_warranty_changes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_warranty_changes" ADD CONSTRAINT "project_warranty_changes_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_warranty_changes" ADD CONSTRAINT "project_warranty_changes_company_id_changed_by_fkey" FOREIGN KEY ("company_id", "changed_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_company_id_document_id_fkey" FOREIGN KEY ("company_id", "document_id") REFERENCES "documents"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_company_id_created_by_fkey" FOREIGN KEY ("company_id", "created_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 보증 기간 0~120개월, 종료 예정일은 시작일 이후 (기간 0이면 시작일과 같음), 사유 500자까지, 발급처 100자까지
ALTER TABLE "project_warranties" ADD CONSTRAINT project_warranties_months_range CHECK ("months" BETWEEN 0 AND 120);
ALTER TABLE "project_warranties" ADD CONSTRAINT project_warranties_end_after_start CHECK ("end_on" >= "start_on");
ALTER TABLE "project_warranties" ADD CONSTRAINT project_warranties_no_warranty_same_day CHECK ("months" > 0 OR "end_on" = "start_on");
ALTER TABLE "project_warranty_changes" ADD CONSTRAINT project_warranty_changes_months_range CHECK ("to_months" BETWEEN 0 AND 120 AND ("from_months" IS NULL OR "from_months" BETWEEN 0 AND 120));
ALTER TABLE "project_warranty_changes" ADD CONSTRAINT project_warranty_changes_reason_length CHECK ("reason" IS NULL OR char_length("reason") BETWEEN 1 AND 500);
ALTER TABLE "warranty_certificates" ADD CONSTRAINT warranty_certificates_issuer_length CHECK ("issuer" IS NULL OR char_length("issuer") BETWEEN 1 AND 100);

-- 같은 문서를 같은 프로젝트의 보증서로 중복 등록할 수 없음 (지운 행은 제외)
CREATE UNIQUE INDEX warranty_certificates_active_unique ON "warranty_certificates"("company_id", "project_id", "document_id") WHERE "removed_at" IS NULL;

-- 앱 계정은 자기 회사 행만. 보증 설정은 값 열만 고칠 수 있고 지울 수 없음, 변경 이력은 추가만, 보증서는 만료일·발급처·삭제 시각만 고침
ALTER TABLE "project_warranties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_warranties" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "project_warranties" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "project_warranties" TO field_note_app;
GRANT UPDATE ("months", "start_basis", "start_on", "end_on", "updated_by", "updated_at") ON "project_warranties" TO field_note_app;

ALTER TABLE "project_warranty_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_warranty_changes" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "project_warranty_changes" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "project_warranty_changes" TO field_note_app;

ALTER TABLE "warranty_certificates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warranty_certificates" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "warranty_certificates" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "warranty_certificates" TO field_note_app;
GRANT UPDATE ("issuer", "expires_on", "removed_at") ON "warranty_certificates" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "project_warranties" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "project_warranties"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "project_warranties" TO field_note_purge;
CREATE POLICY purge_only ON "project_warranty_changes" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "project_warranty_changes"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "project_warranty_changes" TO field_note_purge;
CREATE POLICY purge_only ON "warranty_certificates" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "warranty_certificates"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "warranty_certificates" TO field_note_purge;
