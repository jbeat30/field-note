-- 멱등 키 저장소: 회선이 불안해 같은 쓰기 요청이 다시 와도 한 번만 처리하려고 키와 성공 응답을 24시간 보관한다.
-- 키는 해시로 저장하고, 처리 중 표시는 짧은 만료 시각을 가진다
CREATE TABLE "idempotency_keys" (
    "company_id" UUID NOT NULL,
    "key_hash" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "status" INTEGER,
    "body" JSONB,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("company_id","key_hash"),
    CONSTRAINT "idempotency_keys_state_check" CHECK ("state" IN ('PROCESSING', 'DONE'))
);

CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 앱 계정은 자기 회사 행만 조회·추가·수정·삭제 (처리가 실패하면 선점을 풀어야 하므로 삭제 가능)
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "idempotency_keys" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "idempotency_keys" TO field_note_app
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "idempotency_keys" TO field_note_app;

-- 해지 유예가 끝난 회사의 삭제 작업 (해지 삭제 정책은 closure/purgePolicy.ts)
CREATE POLICY purge_only ON "idempotency_keys" TO field_note_purge
  USING (EXISTS (SELECT 1 FROM "companies" c WHERE c."id" = "idempotency_keys"."company_id" AND c."status" = 'CLOSING'));
GRANT SELECT, DELETE ON "idempotency_keys" TO field_note_purge;
