-- 조회 전용 계정: DB 도구(WebStorm 등)로 직접 볼 때 소유 계정 대신 사용
-- 앱 계정과 같은 회사 격리를 따르는 SELECT만 허용: `SELECT set_config('app.company_id', '<회사 ID>', false)`로 회사를 지정하기 전에는 어떤 행도 보이지 않음
-- 회사 테이블의 정책은 대상 계정을 지정하지 않아(public) 함께 포함
-- 앱 계정이 접근하지 못하는 테이블(세션·비밀번호 해시·2단계 인증·초대·인증 코드·소셜 연동·운영자 기록)은 정책이 없어 자동으로 제외
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'field_note_readonly') THEN
    CREATE ROLE field_note_readonly LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO field_note_readonly;

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT tablename, qual
      FROM pg_policies
     WHERE schemaname = 'public' AND policyname = 'company_isolation' AND ('field_note_app' = ANY (roles) OR 'public' = ANY (roles))
  LOOP
    EXECUTE format(
      'CREATE POLICY readonly_isolation ON %I FOR SELECT TO field_note_readonly USING (%s)',
      target.tablename,
      target.qual
    );
    EXECUTE format('GRANT SELECT ON %I TO field_note_readonly', target.tablename);
  END LOOP;
END
$$;
