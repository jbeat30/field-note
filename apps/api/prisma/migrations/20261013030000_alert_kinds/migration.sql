-- AlterEnum
-- 4단계 알림: 보증 종료 임박, 미처리 보수 요청, 보증서·직원 서류 만료 임박, 월 공수 미확정 (서비스 기획서 §15.3)
ALTER TYPE "alert_kind" ADD VALUE 'WARRANTY_ENDING';
ALTER TYPE "alert_kind" ADD VALUE 'REPAIR_UNHANDLED';
ALTER TYPE "alert_kind" ADD VALUE 'CERTIFICATE_EXPIRING';
ALTER TYPE "alert_kind" ADD VALUE 'CREDENTIAL_EXPIRING';
ALTER TYPE "alert_kind" ADD VALUE 'MONTH_UNCLOSED';
