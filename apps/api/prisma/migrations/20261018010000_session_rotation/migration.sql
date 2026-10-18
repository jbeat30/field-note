-- 세션 보강: 미사용 만료(로그인 유지를 선택하지 않은 세션), 토큰 교체 이력, 로그인 유지 세션의 유효 기간 7일
ALTER TABLE "sessions" ADD COLUMN "idle_expires_at" TIMESTAMPTZ(3);
ALTER TABLE "sessions" ADD COLUMN "rotated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sessions" ADD COLUMN "previous_token_hash" TEXT;

CREATE UNIQUE INDEX "sessions_previous_token_hash_key" ON "sessions"("previous_token_hash");

-- 이미 발급된 로그인 유지 세션도 로그인 후 7일을 넘기지 않게 줄임
UPDATE "sessions" SET "expires_at" = LEAST("expires_at", "created_at" + INTERVAL '7 days');

-- 사용 때마다 미사용 만료 연장, 토큰 교체 때 토큰 해시와 이전 해시·교체 시각 갱신
GRANT UPDATE ("token_hash", "idle_expires_at", "rotated_at", "previous_token_hash") ON "sessions" TO field_note_auth;
