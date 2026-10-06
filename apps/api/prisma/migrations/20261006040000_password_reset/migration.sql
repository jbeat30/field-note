-- AlterTable
ALTER TABLE "email_verifications" ADD COLUMN     "pending_email" TEXT;

-- CreateTable
CREATE TABLE "password_resets" (
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT,
    "expires_at" TIMESTAMPTZ(3),
    "last_requested_at" TIMESTAMPTZ(3) NOT NULL,
    "window_started_at" TIMESTAMPTZ(3) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("company_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_company_id_user_id_fkey" FOREIGN KEY ("company_id", "user_id") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 재설정 링크 상태는 회사 범위 밖 전용 계정만 접근 (토큰 해시 보호). 삭제 권한은 두지 않고 사용 시 토큰 값만 비움
ALTER TABLE "password_resets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_resets" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_module_only ON "password_resets" TO field_note_auth USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON "password_resets" TO field_note_auth;
