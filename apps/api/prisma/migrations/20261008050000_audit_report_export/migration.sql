-- AlterEnum
-- 내보내기도 감사 기록으로 남김 (서비스 기획서 §7.3, §15.4)
ALTER TYPE "audit_action" ADD VALUE 'REPORT_EXPORTED';
