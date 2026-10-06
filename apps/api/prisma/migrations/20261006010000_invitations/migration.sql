-- CreateEnum
CREATE TYPE "operator_action_type" AS ENUM ('COMPANY_CREATED', 'INVITATION_ISSUED');

-- CreateTable
CREATE TABLE "invitations" (
    "token_hash" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("token_hash")
);

-- CreateTable
CREATE TABLE "operator_actions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "company_id" UUID NOT NULL,
    "action" "operator_action_type" NOT NULL,
    "operator" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invitations_company_id_user_id_idx" ON "invitations"("company_id", "user_id");

-- CreateIndex
CREATE INDEX "invitations_expires_at_idx" ON "invitations"("expires_at");

-- CreateIndex
CREATE INDEX "operator_actions_company_id_idx" ON "operator_actions"("company_id");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_company_id_user_id_fkey" FOREIGN KEY ("company_id", "user_id") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_actions" ADD CONSTRAINT "operator_actions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 운영자 전용 DB 계정: 회사·계정·초대 발급과 작업 기록만 가능, 업무 테이블·세션·비밀번호 권한 없음 (§5.4)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'field_note_operator') THEN
    CREATE ROLE field_note_operator LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO field_note_operator;

CREATE POLICY operator_only ON "companies" TO field_note_operator USING (true) WITH CHECK (true);
GRANT SELECT, INSERT ON "companies" TO field_note_operator;

CREATE POLICY operator_only ON "users" TO field_note_operator USING (true) WITH CHECK (true);
GRANT SELECT, INSERT ON "users" TO field_note_operator;

-- 초대: 운영자가 발급·재발급(기존 링크 즉시 만료), 전용 계정이 조회와 사용 처리
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitations" FORCE ROW LEVEL SECURITY;
CREATE POLICY operator_only ON "invitations" TO field_note_operator USING (true) WITH CHECK (true);
CREATE POLICY auth_module_only ON "invitations" TO field_note_auth USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON "invitations" TO field_note_operator;
GRANT SELECT, UPDATE ON "invitations" TO field_note_auth;

-- 운영자 작업 기록은 추가만 가능 (수정·삭제 권한 없음), 운영자만 접근
ALTER TABLE "operator_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "operator_actions" FORCE ROW LEVEL SECURITY;
CREATE POLICY operator_only ON "operator_actions" TO field_note_operator USING (true) WITH CHECK (true);
GRANT SELECT, INSERT ON "operator_actions" TO field_note_operator;

-- 약관 문서 등록은 운영 경로 (본문 해시 등록)
GRANT SELECT, INSERT ON "legal_documents" TO field_note_operator;
