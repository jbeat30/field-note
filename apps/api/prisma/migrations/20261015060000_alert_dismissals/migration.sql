-- 숨긴 알림 (09 문서 §5.4): 알림은 저장하지 않고 계산하므로 사용자가 숨긴 알림의 키(종류|대상|조건 값)만 보관
-- 조건이 바뀌면(겹친 날 변경, 새 만료일 등) 키가 달라져 알림 재표시
CREATE TABLE "alert_dismissals" (
    "company_id" UUID NOT NULL,
    "alert_key" TEXT NOT NULL,
    "dismissed_by" UUID NOT NULL,
    "dismissed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_dismissals_pkey" PRIMARY KEY ("company_id","alert_key"),
    CONSTRAINT "alert_dismissals_key_length" CHECK (char_length("alert_key") BETWEEN 1 AND 300)
);

ALTER TABLE "alert_dismissals" ADD CONSTRAINT "alert_dismissals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alert_dismissals" ADD CONSTRAINT "alert_dismissals_dismissed_by_fkey" FOREIGN KEY ("company_id", "dismissed_by") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 앱 계정은 자기 회사 행만 조회·추가한다 (같은 키를 다시 숨기면 무시, 수정·삭제 불가)
ALTER TABLE "alert_dismissals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alert_dismissals" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "alert_dismissals" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON "alert_dismissals" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "alert_dismissals" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "alert_dismissals"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "alert_dismissals" TO field_note_purge;
