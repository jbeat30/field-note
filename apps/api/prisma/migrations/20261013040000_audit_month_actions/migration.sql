-- AlterEnum
-- 월 공수 확정·재오픈도 감사 기록으로 남김 (서비스 기획서 §13.1)
ALTER TYPE "audit_action" ADD VALUE 'MONTH_CLOSED';
ALTER TYPE "audit_action" ADD VALUE 'MONTH_REOPENED';
