-- CreateTable
CREATE TABLE "project_assignments" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "planned_minutes" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(3),

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "project_period_changes" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "from_start" DATE NOT NULL,
    "from_end" DATE NOT NULL,
    "to_start" DATE NOT NULL,
    "to_end" DATE NOT NULL,
    "reason" TEXT,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_period_changes_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "project_assignments_company_id_project_id_idx" ON "project_assignments"("company_id", "project_id");

-- CreateIndex
CREATE INDEX "project_assignments_company_id_employee_id_start_date_end_d_idx" ON "project_assignments"("company_id", "employee_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "project_period_changes_company_id_project_id_changed_at_idx" ON "project_period_changes"("company_id", "project_id", "changed_at");

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- 투입은 같은 회사의 프로젝트·직원만 가리킬 수 있음 (복합 키)
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_company_id_employee_id_fkey" FOREIGN KEY ("company_id", "employee_id") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_period_changes" ADD CONSTRAINT "project_period_changes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_period_changes" ADD CONSTRAINT "project_period_changes_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_period_changes" ADD CONSTRAINT "project_period_changes_company_id_changed_by_fkey" FOREIGN KEY ("company_id", "changed_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- API 검증과 같은 범위를 DB도 보장
ALTER TABLE "project_assignments" ADD CONSTRAINT project_assignments_period_order CHECK ("start_date" <= "end_date");
-- 계획 공수는 1분 이상 (0이면 '계획 없음'은 비워 두는 것으로 표현), 상한은 약 10만 시간
ALTER TABLE "project_assignments" ADD CONSTRAINT project_assignments_planned_range CHECK ("planned_minutes" IS NULL OR "planned_minutes" BETWEEN 1 AND 6000000);
ALTER TABLE "project_period_changes" ADD CONSTRAINT project_period_changes_period_order CHECK ("to_start" <= "to_end" AND "from_start" <= "from_end");
ALTER TABLE "project_period_changes" ADD CONSTRAINT project_period_changes_changed CHECK ("from_start" <> "to_start" OR "from_end" <> "to_end");
ALTER TABLE "project_period_changes" ADD CONSTRAINT project_period_changes_reason_length CHECK ("reason" IS NULL OR char_length("reason") BETWEEN 1 AND 500);

-- 앱 계정은 자기 회사 행만 조회·추가 (투입은 기간·계획 공수·취소 표시를 위해 수정 가능, 삭제 불가. 기간 변경 이력은 추가만)
ALTER TABLE "project_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "project_assignments" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON "project_assignments" TO field_note_app;

ALTER TABLE "project_period_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_period_changes" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "project_period_changes" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "project_period_changes" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 중인 회사의 행만 보임, 해지 삭제 정책은 closure/purgePolicy.ts)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_assignments', 'project_period_changes']
  LOOP
    EXECUTE format(
      'CREATE POLICY purge_only ON %I TO field_note_purge USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = %I."company_id" AND c."status" = ''CLOSING''))',
      t, t);
    EXECUTE format('GRANT SELECT, DELETE ON %I TO field_note_purge', t);
  END LOOP;
END
$$;
