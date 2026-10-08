-- 파일의 저장소 경로는 반드시 자기 회사 경로(company/{회사 ID}/)로 시작해야 함
-- 애플리케이션 버그가 있어도 다른 회사 경로를 가리키는 파일 행이 생기지 않게 DB가 막는다 (서비스 기획서 §5.1 격리, 기술 기획서 §10)
ALTER TABLE "files" ADD CONSTRAINT files_object_key_company_prefix
  CHECK (left("object_key", length('company/' || "company_id"::text || '/')) = 'company/' || "company_id"::text || '/');
ALTER TABLE "files" ADD CONSTRAINT files_thumbnail_key_company_prefix
  CHECK ("thumbnail_key" IS NULL OR left("thumbnail_key", length('company/' || "company_id"::text || '/')) = 'company/' || "company_id"::text || '/');
