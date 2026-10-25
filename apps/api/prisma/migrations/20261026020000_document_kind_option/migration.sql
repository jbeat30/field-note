-- 문서 종류를 선택 목록(DOCUMENT_CATEGORY)으로 옮김, 종류마다 민감 자료 기본값을 가짐
ALTER TABLE "option_items" ADD COLUMN "sensitive_default" BOOLEAN NOT NULL DEFAULT false;

-- 문서가 있는 회사에는 기존 다섯 종류를 같은 이름으로 채움 (문서가 없는 회사는 처음 열 때 프리셋이 채워짐)
INSERT INTO "option_items" ("company_id", "kind", "name", "name_key", "sort_order", "sensitive_default")
SELECT c."company_id", 'DOCUMENT_CATEGORY', v."name", lower(v."name"), v."sort_order", v."sensitive_default"
FROM (SELECT DISTINCT "company_id" FROM "documents") c
CROSS JOIN (
  VALUES
    ('도면·작업지시서', 0, false),
    ('계약·공문', 1, true),
    ('안전·검사', 2, false),
    ('견적·정산', 3, false),
    ('기타', 4, false)
) AS v("name", "sort_order", "sensitive_default");

ALTER TABLE "documents" ADD COLUMN "category_id" UUID;

UPDATE "documents" d
SET "category_id" = o."id"
FROM "option_items" o
WHERE o."company_id" = d."company_id"
  AND o."kind" = 'DOCUMENT_CATEGORY'
  AND o."name" = CASE d."category"::text
    WHEN 'DRAWING' THEN '도면·작업지시서'
    WHEN 'CONTRACT' THEN '계약·공문'
    WHEN 'SAFETY' THEN '안전·검사'
    WHEN 'QUOTE' THEN '견적·정산'
    ELSE '기타'
  END;

ALTER TABLE "documents" ALTER COLUMN "category_id" SET NOT NULL;
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_category_id_fkey" FOREIGN KEY ("company_id", "category_id") REFERENCES "option_items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "documents_company_id_project_id_category_idx";
ALTER TABLE "documents" DROP COLUMN "category";
DROP TYPE "document_category";
CREATE INDEX "documents_company_id_project_id_category_id_idx" ON "documents"("company_id", "project_id", "category_id");
