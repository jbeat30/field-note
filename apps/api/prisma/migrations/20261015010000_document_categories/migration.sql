-- 문서 분류 정리 (09 문서 §3.6): 도면·시방·작업지시 → 도면·작업지시서(DRAWING), 견적·정산(QUOTE) 추가
-- 기존 문서는 시방(SPEC)·작업지시(WORK_ORDER)를 DRAWING으로 옮기고 나머지 분류는 그대로 둔다
ALTER TYPE "document_category" RENAME TO "document_category_old";
CREATE TYPE "document_category" AS ENUM ('DRAWING', 'CONTRACT', 'SAFETY', 'QUOTE', 'OTHER');

ALTER TABLE "documents" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "documents" ALTER COLUMN "category" TYPE "document_category" USING (
  CASE "category"::text
    WHEN 'SPEC' THEN 'DRAWING'
    WHEN 'WORK_ORDER' THEN 'DRAWING'
    ELSE "category"::text
  END
)::"document_category";
ALTER TABLE "documents" ALTER COLUMN "category" SET DEFAULT 'OTHER';

DROP TYPE "document_category_old";
