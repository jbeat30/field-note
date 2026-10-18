-- CreateTable
CREATE TABLE "user_totp" (
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "secret_encrypted" TEXT NOT NULL,
    "enabled_at" TIMESTAMPTZ(3),
    "last_used_step" INTEGER NOT NULL DEFAULT 0,
    "recovery_code_hashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_totp_pkey" PRIMARY KEY ("company_id","user_id")
);

-- AddForeignKey
ALTER TABLE "user_totp" ADD CONSTRAINT "user_totp_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_totp" ADD CONSTRAINT "user_totp_company_id_user_id_fkey" FOREIGN KEY ("company_id", "user_id") REFERENCES "users"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2단계 인증 설정은 회사 범위 밖 전용 계정만 접근 (끄기·복구 코드 재발급을 위해 삭제 권한 포함)
ALTER TABLE "user_totp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_totp" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_module_only ON "user_totp" TO field_note_auth USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON "user_totp" TO field_note_auth;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "user_totp" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "user_totp"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "user_totp" TO field_note_purge;
