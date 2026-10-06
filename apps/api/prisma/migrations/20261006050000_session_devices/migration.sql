-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "device_label" TEXT NOT NULL DEFAULT '알 수 없는 기기',
ADD COLUMN     "last_active_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "public_id" UUID NOT NULL DEFAULT uuidv7();

-- CreateIndex
CREATE UNIQUE INDEX "sessions_public_id_key" ON "sessions"("public_id");


-- 사용 시각 갱신만 허용 (세션의 다른 값은 바꿀 수 없음)
GRANT UPDATE ("last_active_at") ON "sessions" TO field_note_auth;
