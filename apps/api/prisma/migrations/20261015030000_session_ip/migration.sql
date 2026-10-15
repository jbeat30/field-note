-- 로그인한 기기 목록에 접속 IP를 보인다 (09 문서 §5.2): 로그인 때 IP와 마지막 사용 때 IP. 세션이 사라지면 함께 삭제된다
ALTER TABLE "sessions" ADD COLUMN "ip_address" TEXT;
ALTER TABLE "sessions" ADD COLUMN "last_ip" TEXT;

-- 마지막 사용 시각과 함께 마지막 IP도 갱신할 수 있다
GRANT UPDATE ("last_ip") ON "sessions" TO field_note_auth;
