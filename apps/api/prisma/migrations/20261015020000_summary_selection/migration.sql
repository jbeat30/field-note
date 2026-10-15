-- 마감 요약(준공 보고서)에 넣을 사진·문서를 직접 고른다 (09 문서 §3.8). 고르지 않으면 기본 규칙을 쓴다
ALTER TABLE "photos" ADD COLUMN "include_in_summary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN "include_in_summary" BOOLEAN NOT NULL DEFAULT false;
