-- CreateEnum
CREATE TYPE "company_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSING');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('INVITED', 'ACTIVE');

-- CreateEnum
CREATE TYPE "legal_document_type" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "status" "company_status" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "company_id" UUID NOT NULL,
    "email" TEXT,
    "email_verified_at" TIMESTAMPTZ(3),
    "display_name" TEXT NOT NULL,
    "phone" TEXT,
    "age_confirmed_at" TIMESTAMPTZ(3),
    "status" "user_status" NOT NULL DEFAULT 'INVITED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "login_id" TEXT,
    "password_hash" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("company_id","user_id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "type" "legal_document_type" NOT NULL,
    "version" TEXT NOT NULL,
    "effective_at" TIMESTAMPTZ(3) NOT NULL,
    "content_hash" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "is_agreed" BOOLEAN NOT NULL DEFAULT true,
    "decided_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_company_id_key" ON "users"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_login_id_key" ON "user_credentials"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_type_version_key" ON "legal_documents"("type", "version");

-- CreateIndex
CREATE INDEX "consents_company_id_user_id_document_id_idx" ON "consents"("company_id", "user_id", "document_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_company_id_user_id_fkey" FOREIGN KEY ("company_id", "user_id") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_company_id_user_id_fkey" FOREIGN KEY ("company_id", "user_id") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_company_id_user_id_fkey" FOREIGN KEY ("company_id", "user_id") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 아이디·이메일은 소문자로만 저장 (대소문자만 다른 중복 가입 방지)
ALTER TABLE "users" ADD CONSTRAINT users_email_lowercase CHECK ("email" = lower("email"));
ALTER TABLE "user_credentials" ADD CONSTRAINT user_credentials_login_id_lowercase CHECK ("login_id" = lower("login_id"));

-- 로그인 전에는 회사를 알 수 없으므로 전용 계정이 회사 상태를 확인할 수 있어야 함 (조회만)
CREATE POLICY auth_module_only ON "companies" TO field_note_auth USING (true);
GRANT SELECT ON "companies" TO field_note_auth;

-- 계정: 앱 계정은 자기 회사 행만 조회, 전용 계정은 로그인·가입 처리를 위해 모든 행에 접근
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "users" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY auth_module_only ON "users" TO field_note_auth USING (true) WITH CHECK (true);
GRANT SELECT ON "users" TO field_note_app;
GRANT SELECT, INSERT, UPDATE ON "users" TO field_note_auth;

-- 로그인 자격(비밀번호 해시)은 전용 계정만 접근, 앱 계정은 권한 자체가 없음
ALTER TABLE "user_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_credentials" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_module_only ON "user_credentials" TO field_note_auth USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON "user_credentials" TO field_note_auth;

-- 동의 이력은 추가만 가능: 수정·삭제 권한 없음
ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consents" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "consents" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY auth_module_only ON "consents" TO field_note_auth USING (true) WITH CHECK (true);
GRANT SELECT ON "consents" TO field_note_app;
GRANT SELECT, INSERT ON "consents" TO field_note_auth;

-- 약관 버전은 회사와 무관한 공용 자료: 두 계정 모두 조회만, 등록·변경은 운영 경로(소유 계정)
GRANT SELECT ON "legal_documents" TO field_note_app, field_note_auth;
