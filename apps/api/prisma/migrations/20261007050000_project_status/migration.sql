-- 실제 시작일·완료일 (상태를 바꿀 때 기록)
ALTER TABLE "projects" ADD COLUMN "actual_start" DATE;
ALTER TABLE "projects" ADD COLUMN "actual_end" DATE;

-- 이미 진행·완료 상태로 들어 있던 개발용 데이터는 예정일을 실제일로 보정 (아래 일관성 검사를 통과시키기 위함)
UPDATE "projects" SET "actual_start" = "planned_start" WHERE "status" IN ('IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'WARRANTY', 'CLOSED');
UPDATE "projects" SET "actual_end" = "planned_end" WHERE "status" IN ('COMPLETED', 'WARRANTY', 'CLOSED');

-- 상태와 실제일의 일관성: 시작한 적 있는 상태에는 실제 시작일이, 완료 이후 상태에는 실제 완료일이 있고, 그 밖에는 완료일이 없다
ALTER TABLE "projects" ADD CONSTRAINT projects_actual_start_consistency
  CHECK ("status" NOT IN ('IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'WARRANTY', 'CLOSED') OR "actual_start" IS NOT NULL);
ALTER TABLE "projects" ADD CONSTRAINT projects_actual_end_consistency
  CHECK (("status" IN ('COMPLETED', 'WARRANTY', 'CLOSED')) = ("actual_end" IS NOT NULL));
ALTER TABLE "projects" ADD CONSTRAINT projects_actual_order
  CHECK ("actual_start" IS NULL OR "actual_end" IS NULL OR "actual_end" >= "actual_start");

-- CreateTable
CREATE TABLE "project_status_changes" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "from_status" "project_status" NOT NULL,
    "to_status" "project_status" NOT NULL,
    "effective_on" DATE NOT NULL,
    "reason" TEXT,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_status_changes_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "project_status_changes_company_id_project_id_changed_at_idx" ON "project_status_changes"("company_id", "project_id", "changed_at");

-- AddForeignKey
ALTER TABLE "project_status_changes" ADD CONSTRAINT "project_status_changes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_status_changes" ADD CONSTRAINT "project_status_changes_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 변경자는 같은 회사의 계정만 가리킬 수 있음 (복합 키)
ALTER TABLE "project_status_changes" ADD CONSTRAINT "project_status_changes_company_id_changed_by_fkey" FOREIGN KEY ("company_id", "changed_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 중단·취소는 사유가 필수, 사유는 500자까지
ALTER TABLE "project_status_changes" ADD CONSTRAINT project_status_changes_reason_required
  CHECK ("to_status" NOT IN ('SUSPENDED', 'CANCELLED') OR ("reason" IS NOT NULL AND char_length("reason") >= 1));
ALTER TABLE "project_status_changes" ADD CONSTRAINT project_status_changes_reason_length
  CHECK ("reason" IS NULL OR char_length("reason") <= 500);
ALTER TABLE "project_status_changes" ADD CONSTRAINT project_status_changes_status_differs
  CHECK ("from_status" <> "to_status");

-- 앱 계정은 자기 회사 행만 조회·추가 (이력은 수정·삭제할 수 없음)
ALTER TABLE "project_status_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_status_changes" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "project_status_changes" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "project_status_changes" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "project_status_changes" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "project_status_changes"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "project_status_changes" TO field_note_purge;
