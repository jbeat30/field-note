-- AlterEnum
-- 단가표·인건비 조회와 단가 변경을 감사 기록으로 남김 (민감 정보, 서비스 기획서 §7.3 확장)
ALTER TYPE "audit_action" ADD VALUE 'PAY_RATE_VIEWED';
ALTER TYPE "audit_action" ADD VALUE 'PAY_RATE_CHANGED';
ALTER TYPE "audit_action" ADD VALUE 'LABOR_COST_VIEWED';
