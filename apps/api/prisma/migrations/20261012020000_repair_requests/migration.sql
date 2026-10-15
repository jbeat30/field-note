-- CreateEnum
CREATE TYPE "repair_status" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'ON_HOLD', 'DONE');

-- CreateTable
CREATE TABLE "repair_requests" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "received_on" DATE NOT NULL,
    "requester" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "location" TEXT,
    "status" "repair_status" NOT NULL DEFAULT 'RECEIVED',
    "status_changed_on" DATE NOT NULL,
    "resolved_on" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_requests_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "repair_request_status_changes" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "repair_request_id" UUID NOT NULL,
    "from_status" "repair_status" NOT NULL,
    "to_status" "repair_status" NOT NULL,
    "effective_on" DATE NOT NULL,
    "note" TEXT,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_request_status_changes_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "repair_request_links" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "repair_request_id" UUID NOT NULL,
    "work_log_id" UUID,
    "material_record_id" UUID,
    "linked_by" UUID NOT NULL,
    "linked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinked_at" TIMESTAMPTZ(3),

    CONSTRAINT "repair_request_links_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "repair_requests_company_id_project_id_status_idx" ON "repair_requests"("company_id", "project_id", "status");

-- CreateIndex
CREATE INDEX "repair_requests_company_id_status_idx" ON "repair_requests"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "repair_requests_company_id_project_id_seq_key" ON "repair_requests"("company_id", "project_id", "seq");

-- CreateIndex
CREATE INDEX "repair_request_status_changes_company_id_repair_request_id__idx" ON "repair_request_status_changes"("company_id", "repair_request_id", "changed_at");

-- CreateIndex
CREATE INDEX "repair_request_links_company_id_repair_request_id_idx" ON "repair_request_links"("company_id", "repair_request_id");

-- CreateIndex
CREATE INDEX "repair_request_links_company_id_work_log_id_idx" ON "repair_request_links"("company_id", "work_log_id");

-- CreateIndex
CREATE INDEX "repair_request_links_company_id_material_record_id_idx" ON "repair_request_links"("company_id", "material_record_id");

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_company_id_created_by_fkey" FOREIGN KEY ("company_id", "created_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request_status_changes" ADD CONSTRAINT "repair_request_status_changes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request_status_changes" ADD CONSTRAINT "repair_request_status_changes_company_id_repair_request_id_fkey" FOREIGN KEY ("company_id", "repair_request_id") REFERENCES "repair_requests"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request_status_changes" ADD CONSTRAINT "repair_request_status_changes_company_id_changed_by_fkey" FOREIGN KEY ("company_id", "changed_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request_links" ADD CONSTRAINT "repair_request_links_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request_links" ADD CONSTRAINT "repair_request_links_company_id_repair_request_id_fkey" FOREIGN KEY ("company_id", "repair_request_id") REFERENCES "repair_requests"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request_links" ADD CONSTRAINT "repair_request_links_company_id_work_log_id_fkey" FOREIGN KEY ("company_id", "work_log_id") REFERENCES "work_logs"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request_links" ADD CONSTRAINT "repair_request_links_company_id_material_record_id_fkey" FOREIGN KEY ("company_id", "material_record_id") REFERENCES "material_records"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request_links" ADD CONSTRAINT "repair_request_links_company_id_linked_by_fkey" FOREIGN KEY ("company_id", "linked_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 번호는 1 이상, 요청자 1~100자, 내용 1~2000자, 위치 100자까지, 완료일은 완료 상태일 때만(상태와 함께 DB도 검사)
ALTER TABLE "repair_requests" ADD CONSTRAINT repair_requests_seq_positive CHECK ("seq" >= 1);
ALTER TABLE "repair_requests" ADD CONSTRAINT repair_requests_requester_length CHECK (char_length("requester") BETWEEN 1 AND 100);
ALTER TABLE "repair_requests" ADD CONSTRAINT repair_requests_content_length CHECK (char_length("content") BETWEEN 1 AND 2000);
ALTER TABLE "repair_requests" ADD CONSTRAINT repair_requests_location_length CHECK ("location" IS NULL OR char_length("location") BETWEEN 1 AND 100);
ALTER TABLE "repair_requests" ADD CONSTRAINT repair_requests_resolved_consistency CHECK (("status" = 'DONE') = ("resolved_on" IS NOT NULL));
ALTER TABLE "repair_requests" ADD CONSTRAINT repair_requests_status_after_received CHECK ("status_changed_on" >= "received_on");

-- 상태 이력은 다른 상태로의 변경만, 메모 500자까지, 보류로 바꾸거나 완료를 되돌릴 때는 메모 필수
ALTER TABLE "repair_request_status_changes" ADD CONSTRAINT repair_request_status_changes_differs CHECK ("from_status" <> "to_status");
ALTER TABLE "repair_request_status_changes" ADD CONSTRAINT repair_request_status_changes_note_length CHECK ("note" IS NULL OR char_length("note") BETWEEN 1 AND 500);
ALTER TABLE "repair_request_status_changes" ADD CONSTRAINT repair_request_status_changes_note_required CHECK (("to_status" <> 'ON_HOLD' AND "from_status" <> 'DONE') OR "note" IS NOT NULL);

-- 연결은 일지 또는 자재 기록 중 정확히 하나, 같은 대상을 같은 요청에 중복 연결할 수 없음 (해제한 행은 제외)
ALTER TABLE "repair_request_links" ADD CONSTRAINT repair_request_links_exactly_one CHECK (("work_log_id" IS NULL) <> ("material_record_id" IS NULL));
CREATE UNIQUE INDEX repair_request_links_work_log_active_unique ON "repair_request_links"("company_id", "repair_request_id", "work_log_id") WHERE "unlinked_at" IS NULL AND "work_log_id" IS NOT NULL;
CREATE UNIQUE INDEX repair_request_links_material_active_unique ON "repair_request_links"("company_id", "repair_request_id", "material_record_id") WHERE "unlinked_at" IS NULL AND "material_record_id" IS NOT NULL;

-- 앱 계정은 자기 회사 행만, 보수 요청은 요청 내용·상태 열만 고칠 수 있고 지울 수 없음, 상태 이력은 추가만, 연결은 해제 시각만 고침
ALTER TABLE "repair_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "repair_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "repair_requests" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "repair_requests" TO field_note_app;
GRANT UPDATE ("received_on", "requester", "content", "location", "status", "status_changed_on", "resolved_on", "updated_at") ON "repair_requests" TO field_note_app;

ALTER TABLE "repair_request_status_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "repair_request_status_changes" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "repair_request_status_changes" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "repair_request_status_changes" TO field_note_app;

ALTER TABLE "repair_request_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "repair_request_links" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "repair_request_links" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "repair_request_links" TO field_note_app;
GRANT UPDATE ("unlinked_at") ON "repair_request_links" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "repair_requests" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "repair_requests"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "repair_requests" TO field_note_purge;
CREATE POLICY purge_only ON "repair_request_status_changes" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "repair_request_status_changes"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "repair_request_status_changes" TO field_note_purge;
CREATE POLICY purge_only ON "repair_request_links" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "repair_request_links"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "repair_request_links" TO field_note_purge;
