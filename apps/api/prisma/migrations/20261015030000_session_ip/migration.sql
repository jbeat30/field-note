-- 로그인한 기기 목록의 접속 IP 표시 (09 문서 §5.2): 로그인 때 IP와 마지막 사용 때 IP, 세션 삭제 시 함께 삭제
ALTER TABLE "sessions" ADD COLUMN "ip_address" TEXT;
ALTER TABLE "sessions" ADD COLUMN "last_ip" TEXT;

-- 마지막 사용 시각과 함께 마지막 IP 갱신 가능
GRANT UPDATE ("last_ip") ON "sessions" TO field_note_auth;
