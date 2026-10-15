-- 마감 요약(준공 보고서)에 넣을 사진·문서 직접 선택 (09 문서 §3.8), 선택이 없으면 기본 규칙 사용
ALTER TABLE "photos" ADD COLUMN "include_in_summary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN "include_in_summary" BOOLEAN NOT NULL DEFAULT false;
