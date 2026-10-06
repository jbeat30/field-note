-- AlterEnum
ALTER TYPE "company_status" ADD VALUE 'CLOSED';

-- CreateTable
CREATE TABLE "company_closures" (
    "company_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL,
    "purge_after" TIMESTAMPTZ(3) NOT NULL,
    "cancel_token_hash" TEXT,
    "cancelled_at" TIMESTAMPTZ(3),
    "purged_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_closures_pkey" PRIMARY KEY ("company_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_closures_cancel_token_hash_key" ON "company_closures"("cancel_token_hash");

-- AddForeignKey
ALTER TABLE "company_closures" ADD CONSTRAINT "company_closures_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 해지 요청·취소는 회사 범위 밖 전용 계정이 처리 (로그인이 막힌 사용자도 취소 링크로 접근해야 함)
-- 회사 상태 변경만 허용하고 다른 컬럼은 바꿀 수 없음
GRANT UPDATE ("status") ON "companies" TO field_note_auth;

ALTER TABLE "company_closures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_closures" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_module_only ON "company_closures" TO field_note_auth USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON "company_closures" TO field_note_auth;

-- 삭제 전용 DB 계정: 해지 유예가 끝난 회사의 데이터를 지우고 익명화하는 작업만 수행 (api 서버에는 접속 정보를 주지 않음)
-- 삭제 대상 테이블은 삭제만, 계정·회사는 개인 식별 항목만 수정 가능하고, 동의 이력·운영자 작업 기록은 접근 권한이 없음
-- 모든 정책은 해지 중(CLOSING)인 회사의 행으로 한정 (잘못 호출해도 활성 회사의 데이터는 건드릴 수 없음)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'field_note_purge') THEN
    CREATE ROLE field_note_purge LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO field_note_purge;

-- 수정한 새 행도 조회 정책을 통과해야 하므로 삭제 완료(CLOSED) 상태까지 포함
-- (같은 트랜잭션에서 새 enum 값을 리터럴로 쓸 수 없어 텍스트로 비교)
CREATE POLICY purge_only ON "companies" TO field_note_purge
  USING ("status"::text IN ('CLOSING', 'CLOSED')) WITH CHECK ("status"::text IN ('CLOSING', 'CLOSED'));
GRANT SELECT ON "companies" TO field_note_purge;
GRANT UPDATE ("name", "status") ON "companies" TO field_note_purge;

CREATE POLICY purge_only ON "company_closures" TO field_note_purge
  USING ("cancelled_at" IS NULL) WITH CHECK ("cancelled_at" IS NULL);
GRANT SELECT ON "company_closures" TO field_note_purge;
GRANT UPDATE ("purged_at", "updated_at") ON "company_closures" TO field_note_purge;

CREATE POLICY purge_only ON "users" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "users"."company_id" AND c."status" = 'CLOSING'))
  WITH CHECK (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "users"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT ON "users" TO field_note_purge;
GRANT UPDATE ("display_name", "email", "email_verified_at", "phone", "age_confirmed_at", "updated_at") ON "users" TO field_note_purge;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_credentials', 'sessions', 'invitations', 'email_verifications', 'password_resets', 'social_accounts', 'company_settings', 'projects', 'memos']
  LOOP
    EXECUTE format(
      'CREATE POLICY purge_only ON %I TO field_note_purge USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = %I."company_id" AND c."status" = ''CLOSING''))',
      t, t);
    EXECUTE format('GRANT SELECT, DELETE ON %I TO field_note_purge', t);
  END LOOP;
END
$$;
