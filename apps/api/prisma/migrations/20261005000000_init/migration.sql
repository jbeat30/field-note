
-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateTable
CREATE TABLE "memos" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "company_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memos_pkey" PRIMARY KEY ("company_id","id")
);

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memos" ADD CONSTRAINT "memos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memos" ADD CONSTRAINT "memos_company_id_project_id_fkey" FOREIGN KEY ("company_id", "project_id") REFERENCES "projects"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 앱 전용 DB 계정 (RLS 우회 불가, 비밀번호는 마이그레이션에 두지 않고 db:setup에서 설정)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'field_note_app') THEN
    CREATE ROLE field_note_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO field_note_app;

-- 회사 격리: app.company_id가 없거나 비어 있으면 NULL이 되어 어떤 행도 보이지 않음
-- FORCE는 테이블 소유자에게도 정책을 적용하기 위한 설정
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "companies"
  USING ("id" = nullif(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "projects"
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE "memos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memos" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON "memos"
  USING ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK ("company_id" = nullif(current_setting('app.company_id', true), '')::uuid);

-- 앱 계정 권한: 회사 생성·삭제는 운영 경로(회사 범위 밖 전용 모듈)에서만 하므로 companies는 조회만
GRANT SELECT ON "companies" TO field_note_app;
GRANT SELECT, INSERT, UPDATE ON "projects", "memos" TO field_note_app;
