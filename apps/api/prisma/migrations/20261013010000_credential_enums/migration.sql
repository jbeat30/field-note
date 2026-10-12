-- AlterEnum
-- 자격 종류 목록, 직원 서류 파일 용도, 직원 서류 열람 감사 기록 (서비스 기획서 §8.4, §12.5)
ALTER TYPE "option_kind" ADD VALUE 'CREDENTIAL_TYPE';
ALTER TYPE "file_purpose" ADD VALUE 'EMPLOYEE_DOCUMENT';
ALTER TYPE "audit_action" ADD VALUE 'EMPLOYEE_DOCUMENT_VIEWED';
