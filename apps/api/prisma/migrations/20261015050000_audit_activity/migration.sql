-- 활동 기록(09 문서 §5.2): 데이터를 바꾼 일(저장·수정·삭제)을 감사 기록에 남긴다. 인건비·단가 조회는 더 남기지 않는다(기존 기록은 보존)
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'WORK_LOG_SAVED';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'WORK_LOG_UPDATED';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'MATERIAL_RECORD_DELETED';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'PHOTO_DELETED';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'DOCUMENT_DELETED';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'PROJECT_UPDATED';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'PROJECT_STATUS_CHANGED';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'EMPLOYEE_UPDATED';

-- 프로젝트별로 거르기 위한 프로젝트 id (대상이 지워져도 기록이 남도록 외래 키 없이 값만 보관)
ALTER TABLE "audit_logs" ADD COLUMN "project_id" UUID;
CREATE INDEX "audit_logs_company_id_project_id_created_at_idx" ON "audit_logs"("company_id", "project_id", "created_at" DESC);
