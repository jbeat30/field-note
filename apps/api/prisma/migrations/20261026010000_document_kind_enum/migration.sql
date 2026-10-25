-- 문서 종류를 회사가 관리하는 선택 목록으로 옮김: 목록 종류 추가
ALTER TYPE "option_kind" ADD VALUE IF NOT EXISTS 'DOCUMENT_CATEGORY';
