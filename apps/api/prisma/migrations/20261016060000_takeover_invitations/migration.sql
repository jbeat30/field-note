-- 초대의 용도(가입·복구·소유자 이전)와 소유자 이전 때 새 소유자 이름, 운영자 작업의 본인 확인 방법 메모
ALTER TABLE "invitations" ADD COLUMN "purpose" "invitation_purpose" NOT NULL DEFAULT 'SIGNUP';
ALTER TABLE "invitations" ADD COLUMN "new_display_name" TEXT;
ALTER TABLE "invitations" ADD CONSTRAINT invitations_new_display_name_length CHECK ("new_display_name" IS NULL OR char_length("new_display_name") BETWEEN 1 AND 50);

-- 본인 확인 방법 (예: "사업자등록증 대조·통화 확인"), 이름·연락처 같은 개인정보 기재 제외
ALTER TABLE "operator_actions" ADD COLUMN "note" TEXT;
ALTER TABLE "operator_actions" ADD CONSTRAINT operator_actions_note_length CHECK ("note" IS NULL OR char_length("note") BETWEEN 1 AND 200);
