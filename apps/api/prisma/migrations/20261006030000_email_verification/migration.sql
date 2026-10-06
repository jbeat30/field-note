-- CreateTable
CREATE TABLE "email_verifications" (
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT,
    "expires_at" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_requested_at" TIMESTAMPTZ(3) NOT NULL,
    "window_started_at" TIMESTAMPTZ(3) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("company_id","user_id")
);

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_company_id_user_id_fkey" FOREIGN KEY ("company_id", "user_id") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 인증 코드는 회사 범위 밖 전용 계정만 접근 (코드 해시 보호). 삭제 권한은 두지 않고 성공 시 코드 값만 비움
ALTER TABLE "email_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_verifications" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_module_only ON "email_verifications" TO field_note_auth USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON "email_verifications" TO field_note_auth;

-- 작업 큐 전용 DB 계정: pg-boss가 자기 스키마(pgboss)만 만들어 쓰고, 업무 테이블 권한은 없음
-- pg-boss는 시작할 때 스키마 생성 권한을 확인하므로 데이터베이스 CREATE 권한만 부여
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'field_note_queue') THEN
    CREATE ROLE field_note_queue LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;

  EXECUTE format('GRANT CREATE ON DATABASE %I TO field_note_queue', current_database());
END
$$;
