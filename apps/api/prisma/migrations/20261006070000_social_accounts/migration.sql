-- CreateEnum
CREATE TYPE "social_provider" AS ENUM ('KAKAO');

-- CreateTable
CREATE TABLE "social_accounts" (
    "provider" "social_provider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("provider","provider_user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_company_id_user_id_provider_key" ON "social_accounts"("company_id", "user_id", "provider");

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_company_id_user_id_fkey" FOREIGN KEY ("company_id", "user_id") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 소셜 연동은 회사 범위 밖 전용 계정만 접근. 연동 해제를 위해 삭제 권한만 부여
ALTER TABLE "social_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_accounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_module_only ON "social_accounts" TO field_note_auth USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, DELETE ON "social_accounts" TO field_note_auth;
